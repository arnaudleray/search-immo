// client-side js
// run by the browser each time your view template is loaded
$(function() {
  // $.get('/lbc-scrapeit', function(posts) {
  // $.get('/lbc-osmosis', function(posts) {
  // $.get('/lbc-cheerio', function(posts) {
  var reqLbc = $.get('/lbc-cheerio');
  var reqOuest = $.get('/ouest-xray');

  $.when(reqLbc, reqOuest).then(function(postsLbc, postsOuest) {
    console.log(postsLbc, postsOuest);
    var posts = postsLbc[0].concat(postsOuest[0]);
    posts.sort((a, b) => { return new Date(b.date) - new Date(a.date); })
    posts.forEach(function(post) {
      $('<li class="item item-' + post.src + '"></li>').html(
        '<a href="' + post.url + '">' +
          '<span class="thumbnail" style="background-image: url(' + post.thumbnail + ')"></span>' +
          '<span class="price">' + post.price + '&nbsp;&euro;</span>' +
          '<span class="date">' + new Date(post.date).toLocaleDateString() + ((post.time) ? (' ' + post.time) : '') + '</span>' +
          '<span class="title">' + post.title + '</span>' +
          ((post.description) ? ('<span class="description">' + post.description + '</span>') : '') +
        '</a>'
      ).appendTo('ul#results');
    });
  });
  // $.get('/pages', function(pages) {
  //   pages.forEach(function(page) {
  //     $('<li></li>').text(page.title).appendTo('ul#pages');
  //   });
  // }); 
  $.get('/title', function(title) {
    $('<i></i>').text(title).appendTo('div#title');
  });   
});