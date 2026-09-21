/* The film's script: one source for the scenes, the captions and the chapters.
   Every on-screen word below is taken from the Lattice website (lattice/index.html). Times are seconds.
   `caption` is not on screen: the film is silent and shows every word itself, so the caption track
   describes the picture instead, in a region of the frame that no text in that scene ever enters. */
(function (root) {
  const TIMELINE = {
    fps: 30,
    width: 1920,
    height: 1080,
    duration: 39.5,
    fadeIn: 0.6,      // a scene's entrance (cubic ease-out)
    exit: 0.6,        // a scene's exit, a dip to paper (cubic ease-in-out)
    endFadeIn: 1.2,   // the end card eases in slower: paper to deep green is the biggest change in the film
    lineIn: 0.8,      // each line's entrance
    // Reading budget checked by render.js --timing: 240 words a minute plus a quarter second per line,
    // reading a line only once it has mostly arrived, and a pause before anything leaves.
    reading: { wordsPerSecond: 4, perLine: 0.25, legibleAfter: 0.5, holdBeforeExit: 0.6, endHold: 1.5 },
    scenes: [
      {
        id: 'scatter', title: 'Scattered', beat: 'The problem', start: 0, end: 7.2, thumb: 5.5,
        caption: { text: 'No sound. Loose notes drift apart.', place: 'left' },
        lines: [
          { role: 'eyebrow', text: 'From scattered to connected', at: 0.4 },
          { role: 'title', text: 'A thought, a passage, a source.', at: 0.8 },
          { role: 'lead', text: 'Give it a place before it disappears.', at: 2.4 }
        ]
      },
      {
        id: 'notebook', title: 'A notebook', beat: 'What Lattice does', start: 7.2, end: 14.6, thumb: 12.6,
        caption: { text: 'A note opens in the Lattice app.', place: 'left' },
        lines: [
          { role: 'eyebrow', text: 'Lattice', at: 7.6 },
          { role: 'title', text: 'Collect the pieces.', at: 7.9 },
          { role: 'title-soft', text: 'Find the connection.', at: 8.8 },
          { role: 'lead', text: 'A notebook for the thought that becomes something bigger.', at: 9.8 }
        ]
      },
      {
        id: 'capture', title: 'Capture the spark', beat: 'Feature 01', start: 14.6, end: 20.2, thumb: 18.9,
        caption: { text: 'The note links back to its source.', place: 'left' },
        lines: [
          { role: 'eyebrow', text: '01 / Capture', at: 15.0 },
          { role: 'title', text: 'Capture the spark.', at: 15.3 },
          { role: 'lead', text: 'Collect a note and its source.', at: 16.3 }
        ]
      },
      {
        id: 'connect', title: 'See the relationship', beat: 'Feature 02', start: 20.2, end: 25.8, thumb: 24.5,
        caption: { text: 'Lines join one idea to four notes.', place: 'left' },
        lines: [
          { role: 'eyebrow', text: '02 / Connect', at: 20.6 },
          { role: 'title', text: 'See the relationship.', at: 20.9 },
          { role: 'lead', text: 'Keep related notes in view.', at: 21.9 }
        ]
      },
      {
        id: 'export', title: 'Let the idea travel', beat: 'Feature 03', start: 25.8, end: 31.4, thumb: 30.1,
        caption: { text: 'The note turns into a Markdown file.', place: 'left' },
        lines: [
          { role: 'eyebrow', text: '03 / Export', at: 26.2 },
          { role: 'title', text: 'Let the idea travel.', at: 26.5 },
          { role: 'lead', text: 'Export clean Markdown.', at: 27.5 }
        ]
      },
      {
        id: 'end', title: 'Lattice', beat: 'End card', start: 31.4, end: 39.5, thumb: 39.4,
        caption: { text: 'The Lattice mark draws on green.', place: 'center' },
        lines: [
          { role: 'brand', text: 'lattice', at: 32.2 },
          { role: 'title', text: 'Make room for the connection.', at: 33.0 },
          { role: 'note', text: 'Local-first. Your notes. Your next idea.', at: 34.5 },
          { role: 'fine', text: 'A fictional product demonstration.', at: 36.0 }
        ]
      }
    ]
  };
  // A line stays until its scene fades; captions end with it.
  for (const s of TIMELINE.scenes) for (const l of s.lines) l.until = s.end;
  if (typeof module !== 'undefined') module.exports = TIMELINE; else root.TIMELINE = TIMELINE;
})(this);
