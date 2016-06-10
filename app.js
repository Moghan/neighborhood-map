var el_flickrImg = document.getElementById('flickr-img');
var el_infoContent = document.getElementById('location-info-ID');
var el_infoContentWiki = document.getElementById('content-wiki-ID');

var CONST = {
    WIKI_ARTICLES : 1,
    WIKI_ARTICLE_URLS : 3
}

var viewModel = {
  m_title: ko.observable("Adam"),
  jumboTitle: ko.observable("Bertington"),

  locations: ko.observableArray(),
  searchString: ko.observable(''),
  currLocation : ko.observable(null)
}

function searchAltered() {
  console.log('searchAltered');
}

//https://en.wikipedia.org/w/api.php?action=query&titles=San_Francisco&prop=images&imlimit=20&format=jsonfm

viewModel.setFlickrImg = function (setId, picId) {
	//var el_flickrImg = document.getElementById('flickr-img');

	var URL = "https://api.flickr.com/services/rest/" + 
	"?method=flickr.galleries.getPhotos" +
	"&api_key=35ea935c9632cde77aec12c324007f6d" +
	"&gallery_id=" + setId +
	"&format=json" +
	"&nojsoncallback=1";

	var _URL = "https://api.flickr.com/services/rest/?method=flickr.galleries.getPhotos&api_key=35ea935c9632cde77aec12c324007f6d&gallery_id=72157663756796363&format=json&nojsoncallback=1";

	$.getJSON(URL, function(data) {
		$.each(data.photos.photo, function(i, item) {
		  var img_src = "http://farm" + item.farm + ".static.flickr.com/" +
		    item.server + "/" + item.id + "_" + item.secret + "_n.jpg";
		    if(item.id == picId) {
		    	el_flickrImg.src = img_src;
		      //var img_thumb = $("<img/>").attr("src", img_src);
		      //$(img_thumb).appendTo(".location-info_content_flickr-img");
		    }
		});
	});

}

viewModel.init = function() {
  //console.log('loadLocations');
  var url = "locations.json";

  var loadRequestTimeout = setTimeout(function() {
    console.log('failed to get AJAX resources');
  }, 4000);

  var Item = function(data) {

    this.lat =  data.lat;
    this.lng = data.lng;
    this.title = data.title;
    this.wikiTitle = data.wikiTitle;
    this.description = data.description;
    this.url = data.url;
    this.isFocused = ko.observable(false);
    this.setCurrLocation = function() { viewModel.currLocation(this); console.log('toggleFocus');};
     
    this.marker = new google.maps.Marker({
                        map: map,
                        animation: google.maps.Animation.BOUNCE,
                        title: this.title,
                        position: {lat: parseFloat(this.lat), lng: parseFloat(this.lng)}
                      });
    this.show = ko.computed(function(){ return this.title.toLowerCase().indexOf(viewModel.searchString().toLowerCase()) >-1; }, this);
    this.showMarker = ko.computed(function(){ this.show() ? this.marker.setMap(map) : this.marker.setMap(null)}, this);
    this.animateMarker = ko.computed( function(){ viewModel.currLocation() === this ? this.marker.setAnimation(google.maps.Animation.BOUNCE) : this.marker.setAnimation(null)}, this);
	this.flickrImg = data.flickrImg;
  }
 
  $.ajax({
    url: url,
    dataType: "json",
    success: function(response) {
      var arr = response.map(function(item) { return new Item(item); });
      arr.forEach(function(item){ viewModel.locations.push(item)});

      console.log('ajax success');
      //createMarkerArray();
      clearTimeout(loadRequestTimeout);
      //console.log(viewModel.locations()[0].marker);
    }
  });
  
  this.addEventListeners();
}

viewModel.locationButton_onClick = function () {
  var self = this;

  // Current location clicked hides the info-content element
  if(viewModel.currLocation() === self)
    el_infoContent.classList.toggle('hide');
  // Else new current is set and info-content displayed
  else {
    viewModel.currLocation(self);
    el_infoContent.classList.remove('hide');
  }

  viewModel.setCurrLocation(self);
  viewModel.loadData_Wiki(self);
  viewModel.setFlickrImg(self.flickrImg.album, self.flickrImg.imgId);
}

viewModel.setCurrLocation = function (clickedLocationBtn) {
		//var self = this;

		console.log('setCurrLocation');
		viewModel.currLocation(clickedLocationBtn);
		
	}

viewModel.initImages = function(gallery) {
  var URL = "https://api.flickr.com/services/rest/" + 
    "?method=flickr.galleries.getPhotos" +
    "&api_key=35ea935c9632cde77aec12c324007f6d" +
    "&gallery_id=" + gallery +
    "&format=json" +
    "&nojsoncallback=1";
    
  var _URL = "https://api.flickr.com/services/rest/?method=flickr.galleries.getPhotos&api_key=35ea935c9632cde77aec12c324007f6d&gallery_id=72157663756796363&format=json&nojsoncallback=1";
    
  $.getJSON(URL, function(data) {
    $.each(data.photos.photo, function(i, item) {
      var img_src = "http://farm" + item.farm + ".static.flickr.com/" +
        item.server + "/" + item.id + "_" + item.secret + "_n.jpg";
        if(item.id == "25798718074") {
          var img_thumb = $("<img/>").attr("src", img_src).css("margin", "8px");
          $(img_thumb).appendTo("#flickr-images");
        }
    });
  });
  
}

viewModel.loadData_Wiki = function(clickedLocationBtn) {
    // console.log(clickedLocationBtn.wikiTitle);
    var wikiurl = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=' + clickedLocationBtn.wikiTitle;
    var $wikiElem = $('.location-info_content_wiki');

    var wikiRequestTimeout = setTimeout(function() {
        $wikiElem.text('failed to get wikipedia resources');
    }, 2000);

    function addWikiToDom(wikiData) {
      console.log(wikiData);      

      var pages = wikiData.query.pages;
      var propertyNames = Object.keys(pages);
      // console.log(pages[propertyNames[0]].extract);
      $wikiElem.text(pages[propertyNames[0]].extract);
    }

    $.ajax({
        url: wikiurl,
        dataType: "jsonp",
        success: function(response) {
            //sessionStorage.setItem('wikiData', JSON.stringify(response));
            addWikiToDom(response);
            clearTimeout(wikiRequestTimeout);
        }
    });
    //return false;
}

// Calculate max-height of the info-content element, so it does not exceed bottom of browser-window
viewModel.setElementHeights = function () {
   var imgHeight = el_flickrImg.height;
   var screenSize = document.documentElement.clientHeight;

   el_infoContentWiki.style.maxHeight = (screenSize - imgHeight) + 'px';
}

viewModel.onResizeWindow = function () {
  viewModel.setElementHeights();
}

viewModel.addEventListeners = function () {
  window.addEventListener('resize', this.onResizeWindow);
  window.addEventListener('ready', this.onResizeWindow);
}

viewModel.hideLocationInfo = function () {
  document.querySelector(".location-info").classList.add("hide");
}

/*viewModel.showLocationInfo = function () {
  document.querySelector(".location-info").classList.remove("hide");
}*/

ko.applyBindings(viewModel);


var map;

var initMap = function () {
	console.log('im');
	map = new google.maps.Map(document.getElementById('map'), {
	    center: {lat: 59.654159, lng: 12.584117},
	    zoom: 13
	});

	viewModel.init();
}