module.exports = {
  testEnvironment: "jsdom", // Required for React Testing Library
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest", // Use Babel for transforms
  },
  moduleFileExtensions: ["js", "jsx", "json", "node"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"], // Load your setup file
  moduleNameMapper: {
    // Mock CSS and static files to prevent Jest parse errors
    "^.+\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^.+\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/test/__mocks__/fileMock.js",
  },
  transformIgnorePatterns: ["/node_modules/"], // allow babel-jest to transform src files
};
