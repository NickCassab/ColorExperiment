// If you're using Create React App, create a file called craco.config.js in the root of your project:

module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        // Ignore warnings about missing source maps
        webpackConfig.ignoreWarnings = [
          function ignoreSourcemapsloaderWarnings(warning) {
            return (
              warning.module &&
              warning.module.resource.includes('@mediapipe/tasks-vision') &&
              warning.details &&
              warning.details.includes('source-map-loader')
            );
          },
        ];
        return webpackConfig;
      },
    },
  };