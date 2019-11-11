import minify from 'rollup-plugin-babel-minify'
import del from 'rollup-plugin-delete'
import replace from 'rollup-plugin-re'

export default [
{
    input: 'src/javascript/phasorviz.js',
    output: {
        file: 'web/js/phasorviz.min.js',
        name: 'PhasorViz',
        format: 'iife'
    },
    plugins: [
        del({ targets: 'web/*' }),
        replace({
          defines: {
            APP: true,
            WEB: false,
          }
        }),
        minify({
            comments : false
        })
    ]
}
];