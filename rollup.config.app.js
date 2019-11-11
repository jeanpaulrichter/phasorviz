import minify from 'rollup-plugin-babel-minify'
import del from 'rollup-plugin-delete'
import replace from 'rollup-plugin-re'

export default [
{
    input: 'src/javascript/phasorviz.js',
    output: {
        file: 'android/app/src/main/assets/www/js/phasorviz.min.js',
        name: 'PhasorViz',
        format: 'iife'
    },
    plugins: [
        del({ targets: 'android/app/src/main/assets/www/*' }),
        replace({
            patterns: [
            {
                test: /'appmode' : false/g,
                replace: '"appmode" : true'
            }
            ],
          defines: {
            APP: false,
            WEB: true,
          }
        }),
        minify({
            comments : false
        })
    ]
}
];