const glob = require('glob')
const path = require('path')
const fs   = require('fs')
const test = require('tape')
const fixtures = require('./fixtures')
const pdf    = require('../lib')

process.env.TZ = 'Europe/Berlin'

const args = process.argv.slice(2)
if (args.length) {
  run(args, true)
} else {
  glob(path.join(__dirname, 'pdfs/**/*.js'), function (err, files) {
    if (err) throw err
    run(files)
  })
}

function run(files, force) {
  const f = fixtures.create()

  files.forEach(function(scriptPath) {
    const dirname  = path.dirname(scriptPath)
    const basename = path.basename(scriptPath, '.js')

    // ignore tests starting with _ and named `test`
    if (!force && (basename[0] === '_' || basename === 'test')) {
      return
    }

    const expectationPath = path.join(dirname, basename + '.pdf')
    const resultPath      = path.join(dirname, basename + '.result.pdf')

    const script = require(path.join('../', scriptPath))


    const doc = new pdf.Document({
      font:      f.font.afm.regular,
      padding:   10
    })

    script(doc, f)

    const relativePath = path.relative(path.join(__dirname, 'pdfs'), dirname)
    test(path.join(relativePath, basename), function (t) {
      doc.info.id = '42'
      doc.info.creationDate = new Date(2015, 1, 19, 22, 33, 26)
      doc.info.producer = 'pdfjs tests (github.com/rkusa/pdfjs)'

      const w = fs.createWriteStream(resultPath)
      doc.pipe(w)

      doc.end().catch(err => {
        t.error(err)
      })

      w.on('close', () => {
        try {
          var result = fs.readFileSync(resultPath, 'binary')
          var expectation = fs.readFileSync(expectationPath, 'binary')
        } catch (err) {
          t.error(err)
        }

        t.ok(result === expectation, basename)
        t.end()
      })
    })
  })
}
