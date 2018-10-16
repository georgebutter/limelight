
// Default gulp modules
const gulp = require('gulp')
const tap = require('gulp-tap')
const babel = require('gulp-babel')
const minify = require('gulp-minify')
// const rename = require('gulp-rename'); // Helps rename files or changing extensions
// const babelMinify = require('gulp-babel-minify'); // Converts to ES5 before minifying
const gutil = require('gulp-util') // Helps with debugging
const eslint = require('gulp-eslint')

// Additional release gulp modules
const env = require('gulp-env') // For accessing environment variables
const runSequence = require('run-sequence') // Runs a sequence of gulp tasks
const conventionalChangelog = require('gulp-conventional-changelog') // Generates a changelog from git metadata
const args = require('yargs').argv // Add additional arguments to the commands
const conventionalGithubReleaser = require('conventional-github-releaser') // Make a new release from github metadata
const bump = require('gulp-bump') // Increases the version number
const git = require('gulp-git') // Run git functions with gulp
// const fs = require('fs'); // For working with the local file system

// Define the location of our build directory
const destination = 'dist/'
const source = 'lib/limelight.js'

let type = 'patch'
let version = null

// function getPackageJsonVersion() {
//   // We parse the json file instead of using require because require caches
//   // multiple calls so the version number won't be updated
//   return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
// }

// The default task, run it using `gulp`
// Converts source to ES5 and creates a minified version and builds to dist
// gulp.task('build', () => gulp.src(source)
// // First convert it to ecma2015
//   .pipe(babel({
//     presets: ['env']
//   }))
// // Add a non minified version to the dist
// // .pipe(gulp.dest(destination))
//   .pipe(minify())
// // If there is an error during minification this will pretty print to the console
//   .on('error', (err) => { gutil.log(gutil.colors.red('[Error]'), err.toString()) })
// // Then we can adjust the extension include min
// // .pipe(rename({ extname: '.min.js' }))
// // Then we output to the destination
//   .pipe(gulp.dest(destination)))

// Add the new version to the changelog
gulp.task('changelog', () => gulp.src('CHANGELOG.md', {
  buffer: false
})
  .pipe(conventionalChangelog({
    preset: 'atom'
  }))
  .pipe(gulp.dest('./')))

// Ensure you duplicated the .env-sample and set your own GitHub token and renamed it .env
// Create a convention github release
gulp.task('github-release', () => {
  env({ file: '.env.json' })
  gutil.log(gutil.colors.blue('[github]'), `Pushing to github using authtoken: ${process.env.GITHUB_AUTH_KEY}`)
  const auth = {
    type: 'oauth',
    url: 'https://api.github.com/',
    token: process.env.GITHUB_AUTH_KEY
  }
  const settings = {
    preset: 'atom'
  }
  const done = function releaseCompleted (err, responses) {
    gutil.log(err)
    gutil.log('release completed')
  }
  conventionalGithubReleaser(auth, settings, done)
})

// Increase the version number
gulp.task('bump-version', () => gulp.src(['./bower.json', './package.json'])
  .pipe(bump({ type }).on('error', gutil.log))
  .pipe(gulp.dest('./'))
  .pipe(tap((file) => {
    const json = JSON.parse(String(file.contents));
    ({ version } = json)
  })))

// Commit git changes
gulp.task('commit-changes', () => gulp.src('.')
  .pipe(git.add())
  .pipe(git.commit(`:bookmark: Create version: ${version} [${type}]`)))

// Push the changes to git
gulp.task('push-changes', (cb) => {
  git.push('origin', 'master', cb)
})

// Create a new semver tag
gulp.task('create-new-tag', (cb) => {
  git.tag(version, `Created Tag for version: ${version}`, (error) => {
    if (error) {
      return cb(error)
    }
    git.push('origin', 'master', { args: '--tags' }, cb)
    return 'Tag created'
  })
})

// Run eslint and stop executing the sequence on fail
gulp.task('lint', () => gulp.src(source)
  .pipe(eslint({
    envs: ['node', 'browser']
  }))
  .pipe(eslint.format())
  .pipe(eslint.failAfterError()))

// Update the version in the license
gulp.task('license', () => {
  gulp.src(`./${source}`)
    .pipe(bump())
    .pipe(gulp.dest('./'))
})

gulp.task('release', (callback) => {
  if (
    args.type === 'minor' ||
    args.type === 'major' ||
    args.type === 'prerelease'
  ) {
    ({ type } = args)
  }
  runSequence(
    // 'lint',
    'bump-version',
    'license',
    'changelog',
    'commit-changes',
    'push-changes',
    'create-new-tag',
    'github-release'
  )
  if (typeof callback === 'function') {
    callback()
  }
})

// Add all test functions here
gulp.task('test', (callback) => {
  runSequence(
    'lint'
  )
  if (typeof callback === 'function') {
    callback()
  }
})
