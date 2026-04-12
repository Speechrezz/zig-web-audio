# Chordic

Music creation game to play with friends. Inspired by Gartic Phone and various Jackbox games.

## Issues

### Track Removal:

Instead of relying on track indices to send information like MIDI events, I should instead use `TrackProcessor` pointers.

Why? If a track is removed, it should be marked for deletion to avoid sending further MIDI events.
Then the track is removed in the WASM backend, which causes track indices to be updated. Since there is a small delay
between this deletion and the `AudioWorklet` message being sent, received, and processed by the main thread, that means there
can be a brief de-sync in track indices, which can cause messages to be sent to the incorrect tracks.