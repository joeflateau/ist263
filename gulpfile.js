var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    less        = require('gulp-less'),
    csso        = require('gulp-csso'),
    uglify      = require('gulp-uglify'),
    imagemin    = require('gulp-imagemin'),
    jade        = require('jade'),
    concat      = require('gulp-concat'),
    autoprefixer= require('gulp-autoprefixer'),
    livereload  = require('gulp-livereload'), // Livereload plugin needed: https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei
    tinylr      = require('tiny-lr'),
    express     = require('express'),
    socketIo    = require('socket.io'),
    app         = express(),
    marked      = require('marked'), // For :markdown filter in jade
    path        = require('path'),
    gm          = require('gulp-gm'),
    rename      = require('gulp-rename');

jade.filters.escape = function( block ) {
  return block
    .replace( /&/g, '&amp;'  )
    .replace( /</g, '&lt;'   )
    .replace( />/g, '&gt;'   )
    .replace( /"/g, '&quot;' )
    .replace( /#/g, '&#35;'  )
    .replace( /\\/g, '\\\\'  )
    .replace( /\n/g, '<br>'   );
}


// --- Basic Tasks ---
gulp.task('css', function() {
  return gulp.src([
      'src/assets/css/*.less'])
    .pipe( 
      less( { 
        includePaths: ['src/assets/css'],
        errLogToConsole: true
      } ) )
    .pipe( autoprefixer({
      browsers: ['last 2 versions']
    }) )
    .pipe( csso() )
    .pipe( gulp.dest('dist/assets/css/') )
    .pipe( livereload());
});

gulp.task('js', function() {
  return gulp.src('src/assets/scripts/*.js')
    .pipe( uglify() )
    .pipe( concat('all.min.js'))
    .pipe( gulp.dest('dist/assets/scripts/'))
    .pipe( livereload());
});

gulp.task('templates', function() {
  return gulp.src('src/*.jade')
    .pipe( livereload());
});

gulp.task('images', ['images-large', 'images-medium', 'images-original'], function() {
  return gulp.src('src/assets/images/*.png')
    .pipe(imagemin({
      progressive:true
    }))
    .pipe(gulp.dest('dist/assets/images'));
});

gulp.task('images-large', function(){
  return gulp.src('src/assets/images/*@responsive.png')
    .pipe(gm(function(gmfile){
      return gmfile.resize(1500).setFormat("jpg");
    }))
    .pipe(rename(function(path){
      path.basename = path.basename.replace("@responsive", "@large");
    }))
    .pipe(gulp.dest('dist/assets/images')); 
});

gulp.task('images-medium', function(){
  return gulp.src('src/assets/images/*@responsive.png')
    .pipe(gm(function(gmfile){
      return gmfile.resize(750).setFormat("jpg");
    }))
    .pipe(rename(function(path){
      path.basename = path.basename.replace("@responsive", "@medium");
    }))
    .pipe(gulp.dest('dist/assets/images')); 
});

gulp.task('images-original', function(){
  return gulp.src('src/assets/images/*@responsive.png')
    .pipe(gm(function(gmfile){
      return gmfile.setFormat("jpg");
    }))
    .pipe(rename(function(path){
      path.basename = path.basename.replace("@responsive", "@original");
    }))
    .pipe(gulp.dest('dist/assets/images')); 
});

gulp.task('express', function() {
  var server = require('http').createServer(app);
  var io = socketIo(server)

  app.set('views', './src');
  app.set('view engine', 'jade');
  app.use(express.static(path.resolve('./dist')));

  app.get('/:deck', function(req, res){
    return res.render(req.params.deck, { mode: "view", deck: req.params.deck });
  });

  app.get('/:deck/present', function(req, res){
    return res.render(req.params.deck, { mode: "present", deck: req.params.deck });
  });

  app.get('/:deck/remote/:id', function(req, res){
    return res.render(req.params.deck, { mode: "remote", id:req.params.id, deck: req.params.deck });
  });

  var votes = {};
  io.on('connection', function(socket){
    socket.on('vote', function(data){
      console.log('vote', data);
      var id = data.id,
          index = data.index;

      if (!votes[id]) votes[id] = {};
      if (!votes[id][index]) votes[id][index] = 0;

      votes[id][index]++;

      io.emit('vote:' + id, Object.keys(votes[id]).map(function(key){ return { key: key, value: votes[id][key]};}));
    });

    socket.on('join', function(room) {
      console.log(room);
      socket.join(room);
    });
    socket.on('newSlide', function(room, slide){
      console.log('newSlide', room, slide);
      socket.broadcast.to(room).emit('newSlide', slide);

    })
  });

  server.listen(1337);
  gutil.log('Listening on port: 1337');
});

gulp.task('_watch', function () {
  livereload.listen(35729);

  gulp.watch('src/assets/css/*.less',['css']);

  gulp.watch('src/assets/scripts/*.js',['js']);

  gulp.watch('src/assets/images/*.png',['images']);

  gulp.watch('src/*.jade',['templates']);
});

gulp.task('fonts', function (){
  return gulp.src([
    'src/assets/fonts/*/stylesheet.css',
    'src/assets/fonts/*/*.eot',
    'src/assets/fonts/*/*.woff',
    'src/assets/fonts/*/*.woff2',
    'src/assets/fonts/*/*.ttf'
    ])
  .pipe(gulp.dest('dist/assets/fonts'));
});

gulp.task('watch', ['default','express','_watch']);

gulp.task('default', ['js','css','templates', 'images','fonts']);