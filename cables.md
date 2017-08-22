# Refactor for logical cables

## The problem

In the current dynamorse model, one Node-RED _wire_ equates to one Node-RED flow, meaning that wiring up multiple video, audio and ancillary outputs from a single source to a single destination is cumbersome and time consuming. Although this is a good match to the theoretical data model for elementary flows of grains, it is not the most user friendly way of connecting devices in an IoT-style. Ideally, you could connect an SDI-In node via a single Node-RED _cable_ to a SDI-Out node and transport all the flows that the SDI-In node generates. Further use cases of using _cables_, a form of _logical connection group_, are listed below.

At the moment, a tight coupling exists between the ledger implementation of registration and discovery and each node. While considering the ability to carry multiple flows per cable, this is also an opportunity to decouple ledger from each node. Ledger is used as the means for a destination to discover the format of the grains it is receiving, but recent brittle changes in the NMOS specifications have illustrated that this is a bad design. A better approach would be for dynamorse to have its own internal model of flows, sources, cables etc., separating it from any specific external registration and discovery system.

A lot of code has been cut and pasted into each Node-RED node to manage the current mechanism and much of this is unnecessarily asynchronous.

## The proposal

1. All wires in Node-RED between nodes change from a single flow-of-grains to a _logical connection group_ containing one of more flows-of-grains.
2. Nodes register themselves with an internal _database_ of node instances, describing any logical connection groups that they create. Valves and funnels can query this database to find out information, such as picture coding and dimensions, they need to further process the input flows.

# Use cases

## MXF interleaved file - e.g. OP1a, UK DPP HD

The Material eXchange Format has a mechanism to interleave frames-worth of video with related audio and ancillary data and this is a very common form of MXF file. When such a file is read by dynamorse, each of the MXF files output tracks should be turned into separate flows and _interleaved_ on a logical cable. Back pressure should be based on the _primary package_ of the file, which is typically the video track. Grain timestamps shall be consistent between the streams so synchronization can be achieved.

If an MXF input node is connected directly to an MXF output file with both input and output set to the same operational pattern, with no filtering, the essence streams inside the input and output files should be the same. Depending on application, identity, timecode and metadata should also be presented.

## Program from an MPEG transport streams

A _program_ in an MPEG transport stream typically consists of one or more packetized elementary streams, often one video, one audio per language / application and related data streams. The streams have consistent 90000Hz timestamps that can be losslessly converted to and from PTP timestamps. The elementary streams of a program, as defined in the _Program Map Table_, should appear as a single logical connection group where each stream is its own flow. Back pressure - where possible e.g. reading from a file - should be primarily based on the stream carrying the _Program Clock Reference_, which is normally the video track.

If an MPEG-TS input with a given program filter is connected directly to an MPEG-TS output, the output should contain a single program transport stream with the same content packetized elementary streams as the input.

## SDI or SDI-over-IP

A serial digital interface (SDI) or its IP-equivalent (SMPTE 2022-6) is a bit stream containing interleaved video, audio and ancillary data. This should present as an output from a node as a logical connection group with one flow of grains per stream in the SDI signal. The flows should have timestamps that allow the synchronization of the streams as in the signal. The signal itself has no back pressure as the input is running against a clock, but any back pressure inside Node-RED controlling how buffers empty should be based on a unidirectional flow.

If an SDI input is connected directly to an SDI output, a similar signal should be created although this signal will be delayed by buffering inside Node-RED.

## Connecting a speaker to logical connection group

A speaker node has the ability to play a sound from a flow containing audio data but, if the input is a logical connection group, cannot process the video or ancillary data signals. In this case, a stereo speaker should select the first audio pair in the logical connection group but provide back pressure according to the rate of the video flow.

This use case implies that a logical connection group must have a concept of flow ordering and be able to notify the speaker which flow to provide back pressure on. This may require an understanding of any grain rate difference between the flows.

## Microphone input to an SDI output

If a microphone input node is connected directly to an SDI node without using a logical connection group containing just one audio flow, the SDI node should produce an error. The reason is that the SDI output requires at least a video flow.

If a user specifically wants to use SDI just to carry audio, they should use a _signal generator_ funnel (does not exist - yet) and combine it into a logical connection group using a _splicer_ valve (see below).

## Many audio channel connections

At a concert, a mixing desk is connected to a stage by a big fat cable containing multiple wires, apparently known in the US as a _mult_. Each identified channel within a _mult_ may contain single audio channels or stereo pairs. Cables may be used to get signals from the stage to the desk, including instruments and microphones, or from the desk back to the stage, e.g. for speakers, monitors and talkback. A logical connection group should scale to carrying many audio channels.

For the time being and to reduce scope, logical connection groups can be scaled but cannot be nested. Splicers can be used to combine two groups into one (see below). In the first instance, logical connection groups will run in one direction only.

## Splice, sever and braid

Logical connection groups need to be joined, split, remapped and filtered so that a destination valve or spout receives only the flows it can process without having to build complex filter logic everywhere. In an IoT approach, this is equivalent to electrical switching and junction boxes.

### Splice

Takes two or more input logical connection groups and splices their flows together into one output logical connection group. A mechanism will be required to determine the following:

- Of the inputs, which should become the primary flow for back pressure on the output?
- What is the ordering of the flows in the output group?

### Sever

Takes a single logical connection group input a filters out certain flows on the output. The following will need to be determined:

- If the primary back pressure flow is filtered out, what is the new primary back pressure flow of the output and how is it mapped back to the input?
- what if the given filter results in a logical connection group with no flows?

### Braid

Takes a single logical connection group on the input and creates a new logical connection group on the output containing the same flows but reordered. Issues to consider include:

- How does back pressure map back along the chain if the primary back pressure flow is reassigned?
- How is the mapping specified without a complex user interface?

## Carriage over transports

Ideally, a logical connection group made available through a HTTP/S spout could be received in its entirety by an HTTP/S funnel. The headers used in arachnid clearer specify which flow is being transported. What is required is the exchange of some kind of manifest so that the sender can advertise the number of flows that are available to the receiver, push or pull, allowing a technical metadata exchange prior to content flowing. Each flow in the group has a name that can be mapped to a sub-URL. For the pull model, the metadata exchange allows each flow too be pulled independently.

This is a chunk of work that needs to be considered after the core tasks to build the internal plumbing for logical groups is completed.

A similar mapping for RTP with header extensions could be considered, although is unlikely to fit with the defined use of SDP files.

## Reverse flows for talkback

A _logical connection group_ is not limited to unidirectional transport of flows. A reverse channel, such as a talkback connection to a cameraman that runs in the same group as the video and audio but in the opposite direction is also possible. A maximum return path delay between the source and destination may be specified to indicate the maximum tolerable delay on the line.

This is a lower priority than other logical connection group features.

# Design

## Changes to redioactive

* Redioactive gets a logical connection group _database_ (Javascript object). The database is exposed through a simple REST API.
* Funnels and valves can synchronously register each of the logical connection group they crate in the database.
* Valves and spouts can synchronously look up groups when initialising by flow identifier and Node-RED wire number and/or node instance identifier (tbd).
* Communication with ledger becomes an optional feature that can be switched on and off, towards a plug in design that could work with different discovery & registration systems or different versions of the same specification.

## Changes to most nodes

* Streampunk nodes will have direct access to the redioactive database via prototype method calls provided as all such nodes extend a redioactive node. No need to reference via the global context. Methods will support a JSON structure for expressing a logical connection group and the flows that it contains.
* Format tags can be expressed in a simpler format that is not coupled to the NMOS v1.0 tags format, meaning that values can be typed ... no need to covert numbers to strings ... and are no longer embedded in arrays. As an example:

```Javascript
var tags = {
  format : [ 'video' ],
  encodingName : [ 'raw' ],
  width : [ '1920' ],
  height : [ `1080` ],
  depth : [ `10` ],
  packing : [ 'v210' ],
  sampling : [ 'YCbCr-4:2:2' ],
  clockRate : [ '90000' ],
  interlace : [ '1' ],
  colorimetry : [ 'BT709-2' ],
  grainDuration : [ '1/25']
};
```

  ... become ...

```Javascript
var tags = {
  format : 'video',
  encodingName : 'raw',
  width : 1920,
  height : 1080,
  depth : 10,
  packing : 'v210',
  sampling : 'YCbCr-4:2:2',
  clockRate : 90000,
  interlace : true,
  colorimetry : 'BT709-2',
  grainDuration : '1/25'
};
```

  This should greatly simplify the code managing tags and reduce easy-to-make mistakes when parsing tag properties. The range and names of tags becomes an internal issue for dynamorse, with registered MIME types will be followed wherever possible. Most aspects of flow and source creation, including default naming and identity management, can be pushed up into redioactive.
* Ledger no longer has to be required in each node and the global context does not have to be checked. Some work will have to be done to ensure that the database is propagated in an appropriate order.

# Original Basecamp post

I have been struggling to work out what the meaning of drawing a line between devices is in the Node-RED representation that I use to plumb things together, such as the output of one device the input of another. Is it one line per flow? Or some other kind of linkage? The complexity of wiring up the elementary flows in sender-receiver pairs in this way in a GUI is high.

Node-RED, a flow-based programming environment for the IoT, calls these constructs _wires_. If we upgrade that to logical _cables_ and consider that devices have connectors, where each cable is multi-core and each connector has multiple terminals. Each multi-core is one or more related flows. In this way, my logical representation of groupings has a familiar physical analog, a cable in a facility.

Moreover, we can consider that cable to be bi-directional. Talk back, camera control and other _signals_ that need to flow back to the operator of a device can be modelled. Other benefits of grouping flows in this way include:

* sharing the same transport security characteristics, i.e. they are secured by the same key pair;
common flow control / back pressure;
* a new class of logical devices that are familiar in the physical world, including break out boxes and stream combiners;
* a useful way to model capabilities;
* much simpler and more intuitive logical facility wiring diagrams.

Turns out that the John-Mailhot-lead revision of the RA has a concept of _logical connection group_, which is pretty much the same idea. I'm going to be implementing this concept, which I view as an extension of NMOS as its stands, into the system I'm implementing over the next couple of months and I'll demonstrate the results back to the group. As a consequence, if I connect a camera to a speaker using a single logical cable, the speaker will filter out the video and ancillary data flows and just play the sound.
