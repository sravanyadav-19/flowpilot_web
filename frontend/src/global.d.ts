// CRA already bundles CSS imports at build time; this declaration lets the
// TypeScript language service understand side-effect stylesheet imports.
declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}

// REACT_APP_* values are injected by react-scripts at build time.
declare const process: {
  env: {
    REACT_APP_API_URL?: string;
  };
};
