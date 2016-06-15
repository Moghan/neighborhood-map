'use strict'

var CONST = {
  url_locations : 'locations.json'
}

var el_flickrImg = document.getElementById('flickr-img');
var el_infoContent = document.getElementById('location-info-ID');
var el_infoContentWiki = document.getElementById('content-wiki-ID');
var el_flickrImgSource = document.getElementById('flickr-img-source-ID');

class ViewModel {
  constructor () {
    this.locations = ko.observableArray();
    this.searchString = ko.observable('');
    this.currLocation = ko.observable(null);
    this.flickrAndWiki_flag = false;
    this.flickrImgFound = ko.observable(false);

    this.addEventListeners();
  }


  addEventListeners () {
    window.addEventListener('resize', this.onResizeWindow);
    el_flickrImg.onload = function() { viewModel.setElementHeights() }
  }


// Loads the locations.json file and push each loaction into an ko.observableArray of (location-)items
// An item also stores data for controlling the google-map-marker for each location.
  init () {
    var loadRequestTimeout = setTimeout(function() {
      console.log('failed to get AJAX resources');
    }, 2000);

    var Item = function(data) {
      this.lat =  data.lat;
      this.lng = data.lng;
      this.title = data.title;
      this.wikiPage = data.wikiPage;
      this.description = data.description;
      this.url = data.url;
      this.isFocused = ko.observable(false);
       
      this.marker = new google.maps.Marker({
                          map: map,
                          title: this.title,
                          position: {lat: parseFloat(this.lat), lng: parseFloat(this.lng)}
                        });
      // When searchString changes, this computed observable sets true or false depending on if searchString exist in location title
      this.show = ko.computed(function(){ return this.title.toLowerCase().indexOf(viewModel.searchString().toLowerCase()) >-1; }, this);
      // When this.show changes, this computed observable hides or shows the locations google-map-marker
      this.showMarker = ko.computed(function(){ this.show() ? this.marker.setMap(map) : this.marker.setMap(null)}, this);
      // This computed observable makes the current locations map-marker bounce
      this.animateMarker = ko.computed( function(){ viewModel.currLocation() === this ? this.marker.setAnimation(google.maps.Animation.BOUNCE) : this.marker.setAnimation(null)}, this);
      this.flickrImg = data.flickrImg;
    }
   
    // Loads locations from JSON-file, and map locations to items that are put in an observableArray
    $.ajax({
      url: CONST.url_locations,
      dataType: "json",
      success: function(response) {
        var arr = response.map(function(item) { return new Item(item); });
        arr.forEach(function(item){ viewModel.locations.push(item)});

        clearTimeout(loadRequestTimeout);
      }
    });

  }  


  loadData_Wiki (wikiPage) {
    var self = this;

    var wikiurl = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=' + wikiPage;
    var $wikiElem = $('.location-info_content_wiki');

    function addWikiToDom(wikiData) {
      var pages = wikiData.query.pages;
      var propertyNames = Object.keys(pages);
      // The page name is its pageid, which is more or less unknown until runtime.
      // Since only one page is in the response its allways on position [0]
      $wikiElem.text(pages[propertyNames[0]].extract);
    }

    $.ajax({
        url: wikiurl,
        dataType: "jsonp",
        success: function(response) {
            addWikiToDom(response);
        },
        error: function() { 
          $wikiElem.text('failed to get wikipedia resources');
        },
        complete: function() {
          self.waitForAllResourcesAndShowLocationInfo();
        }
    });
  }


  loadFlickrImg (flickrImgData) {
    var self = this;

    var URL = "https://api.flickr.com/services/rest/" + 
    "?method=flickr.galleries.getPhotos" +
    "&api_key=35ea935c9632cde77aec12c324007f6d" +
    "&gallery_id=" + flickrImgData.album +
    "&format=json" +
    "&nojsoncallback=1";


    $.getJSON(URL, function(data) {
      // a check that the flickr gallery was found
      if(data.stat === 'ok') {
        $.each(data.photos.photo, function(i, item) {
          var img_src = "http://farm" + item.farm + ".static.flickr.com/" +
            item.server + "/" + item.id + "_" + item.secret + "_n.jpg";
          if(item.id == flickrImgData.imgId) {
            el_flickrImg.src = img_src;
            viewModel.flickrImgFound(true);
          }
        });
      }
      else {
        el_flickrImg.src = '';
        viewModel.flickrImgFound(false);
      }

    })
    .error( function () {
      el_flickrImg.alt = 'failed to get flickr resources';
      el_flickrImg.src = '';
      viewModel.flickrImgFound(false);
    })
    .success( function () {
      el_flickrImg.alt = 'image from flickr';
      el_flickrImgSource.href = flickrImgData.url;
    })
    .complete( function () { self.waitForAllResourcesAndShowLocationInfo() });

  }


  mouseOver (location) {
    location.marker.setAnimation(google.maps.Animation.BOUNCE);
  }


  mouseOut (location) {
    if(location !== viewModel.currLocation())
      location.marker.setAnimation(null);
  }

  
  showLocationInfo () {
    el_infoContent.classList.remove('hide');
  }


  // Shows location-info element after flickr and wiki data is collected
  // TODO: Must be better ways to do this. +Potential bug(what happens if another button is clicked before all data is collected)
  waitForAllResourcesAndShowLocationInfo () {
    if (this.flickrAndWiki_flag) {
      
      this.showLocationInfo();
      // this.setElementHeights();
      this.flickrAndWiki_flag = false;
    }
    else {
      this.flickrAndWiki_flag = true;
    }
  }


  locationButton_onClick  () {
    var self = this;
    // Current location clicked again hides the info-content element
    if(viewModel.currLocation() === self) {
      el_infoContent.classList.toggle('hide');
      viewModel.currLocation(null);
    }
    // Else new current location is set and resources called for
    else {
      viewModel.currLocation(self);
      viewModel.loadData_Wiki(self.wikiPage);
      viewModel.loadFlickrImg(self.flickrImg);
    }
  }


  // set max-height of the location-info_content-wiki element so it does not exceed the viewport
  setElementHeights () {
     var imgHeight = el_flickrImg.height;
     var screenSize = document.documentElement.clientHeight;

     el_infoContentWiki.style.maxHeight = (screenSize - imgHeight) + 'px';
  }


  onResizeWindow () {
    viewModel.setElementHeights();
  }
  
  
  hideLocationInfo () {
    document.querySelector(".location-info").classList.add("hide");
    viewModel.currLocation(null);
  }
}


var viewModel = new ViewModel();
ko.applyBindings(viewModel);

var map;
var initMap = function () {
	map = new google.maps.Map(document.getElementById('map'), {
	    center: {lat: 58.475263, lng: 15.213411},
	    zoom: 6,
      disableDefaultUI: true
	});

	viewModel.init();
}