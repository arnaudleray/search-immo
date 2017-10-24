// client-side js
// run by the browser each time your view template is loaded
$(function() {
  var _postsLbc, _postsOuest, _postsKer, _postsLogic;
  var reqLbc = $.ajax('/lbc-xray', { timeout: 40000 }).success(data => {_postsLbc = data; console.log('LBC', data);}).error(err => {_postsLbc = [];});
  var reqOuest = $.ajax('/ouest-xray', { timeout: 10000 }).success(data => {_postsOuest = data; console.log('OUEST', data);}).error(err => {_postsOuest = [];});
  // var reqKermarrec = $.ajax('/kermarrec-xray', { timeout: 10000 }).success(data => {_postsKer = data; console.log('KER', data);}).error(err => {_postsKer = [];});
  var reqLogic = $.ajax('/logic-xray', { timeout: 10000 }).success(data => {_postsLogic = data; console.log('LOG', data);}).error(err => {_postsLogic = [];});

  $.when(
    reqLbc,
    reqOuest,
    // reqKermarrec,
    reqLogic
  ).then(
    function(
      postsLbc,
      postsOuest,
      // postsKer,
      postsLogic
    ) {
      showPosts();
    },
    function(err) {
      showPosts(); /* alert(JSON.stringify(err)); */
    }
  );
  
  function showPosts() {
    var posts =
      _postsLbc
        .concat(_postsOuest)
        // .concat(_postsKer)
        .concat(_postsLogic);
    posts.sort((a, b) => {
      return isNaN(Date.parse(a.date)) ? -1 :
             isNaN(Date.parse(b.date)) ? 1 :
             (new Date(b.date) - new Date(a.date));
    });
    const srcLbl = {
      'LBC': 'Leboncoin',
      'OUEST': 'Ouest Immo',
      'KER': 'Kermarrec',
      'LOG': 'Logic Immo'
    };
    $('#results').text('');
    posts.forEach(function(post) {
      $('<li class="item item-' + post.src + '"></li>').html(
        '<a href="' + post.url + '">' +
          '<div class="thumbnail" style="background-image: url(' + post.thumbnail + ')">' +
            '<div class="src">' + srcLbl[post.src] + '</div>' +
            '<div class="price">' + post.price + '&nbsp;&euro;</div>' +
            '<div class="date">' +
              (isNaN(Date.parse(post.date)) ? post.date : (new Date(post.date).toLocaleDateString() + ((post.time) ? (' ' + post.time) : ''))) +
            '</div>' +
          '</div>' +
          '<div class="title">' + post.title + '</div>' +
          ((post.description) ? ('<div class="description">' + post.description + '</div>') : '') +
        '</a>'
      ).appendTo('ul#results');
    });
  }
});