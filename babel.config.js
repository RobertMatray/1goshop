module.exports = function (api) {
  api.cache(true)

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          exclude: ['transform-regenerator'],
        },
      ],
    ],
    plugins: [
      'react-native-reanimated/plugin',
      ['react-native-unistyles/plugin', { root: 'src' }],
    ],
  }
}
