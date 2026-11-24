/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      screens: {
        // Figma: sm frames are 402px, lg frames 1512px. Layout switches at 1024.
        lg: '1024px',
        xl: '1280px',
      },
      colors: {
        mint: {
          red: '#f2412e', // brand red (logo, eyebrows)
          cta: '#ee1b0f', // final CTA / feature red
          ink: '#0f0f11',
          paper: '#f3f3f2',
          card: '#292929',
          panel: '#1e1e20',
          menu: '#131315',
          line: '#303033',
          muted: '#8c8c8c',
          body: '#bdbbb6',
          caption: '#7b7b7b',
          // retro theme greys (from the designproject.io skills-repo palette)
          bg0: '#0a0a0a',
          bg1: '#131313',
          bg2: '#1c1c1c',
          fg1: '#c8c8c8',
          fg2: '#808080',
          fg3: '#555555',
        },
      },
      fontFamily: {
        // retro theme: Geist Mono for all body copy, VT323 for display type
        sans: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        display: ['VT323', '"Courier New"', 'monospace'],
      },
      // retro theme: everything is square (arbitrary rounded-[..] values are zeroed in src/input.css)
      borderRadius: {
        btn: '0',
        card: '0',
      },
    },
  },
  plugins: [],
};
