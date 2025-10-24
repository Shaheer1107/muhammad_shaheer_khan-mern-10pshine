// babel.config.cjs
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
  plugins: [
    // ✅ Transform Vite's import.meta.env to process.env for Jest
    function importMetaEnvTransform() {
      return {
        visitor: {
          MetaProperty(path) {
            if (
              path.node.meta.name === "import" &&
              path.node.property.name === "meta"
            ) {
              path.replaceWithSourceString("process");
            }
          },
        },
      };
    },
  ],
};
