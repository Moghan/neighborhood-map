var CONST = {
  url_locations : 'locations.json'
};

// Need this element to calculate height of the content-wiki element. Don´t see a work-around with KO.
var el_flickrImg = document.getElementById('flickr-img');

/**
 * Loads resources asynchronously with jQuerys .ajax and .getJSON. Location data is stored in json format.
 * The Knockout framework is used to separate the model from the view.
 * RESTful api´s  are used to get images from Flickr and information from Wikipedia. Locations are showned on google-map.
 */
class ViewModel {
  constructor () {
    this.locations = ko.observableArray();
    this.searchString = ko.observable('');
    this.flickrAndWiki_flag = false;
    this.flickrImgFound = ko.observable(false);
    this.isGoogleMapError = ko.observable(false);
    this.isWikiError = ko.observable(false);
    this.currWikiText = ko.observable('');
    this.showLocationInfo = ko.observable(false);
    this.maxheightWikiContentElement = ko.observable(0);
    this.currFlickrImageData = ko.observable({ 'href': null, 'src': null, 'alt': null });

    this.currLocation = ko.observable(null);

    this.addEventListeners();
  }


  addEventListeners () {
    window.addEventListener('resize', this.onResizeWindow);

    this.currLocation.subscribe(function(previousValue) {
      if(previousValue !== null) {
        previousValue.stopMarkerAnimation();
      }
    }, this, 'beforeChange');
  }


/**
 * Loads the locations data that are stored in JSON format from the file locations.json.
 * Each locations is then mapped to an object that are pushed to a KO observable array.
 * Each location item is set up with some KO variables that connects with the view.
 */
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
      this.show = ko.computed(() => { return this.title.toLowerCase().indexOf(viewModel.searchString().toLowerCase()) >-1; }, this);
      // When this.show changes, this computed observable hides or shows the locations google-map-marker
      this.showMarker = ko.computed(() => { this.show() ? this.marker.setMap(map) : this.marker.setMap(null);}, this);
      this.flickrImg = data.flickrImg;
    };

    Item.prototype.stopMarkerAnimation = function () {
      this.marker.setAnimation(null);
    };
    
    // In the old version every item had its own computed observable to track if was the current location.
    // Now all items share this function and the stopMarkerAnimation() function instead. PS. Thank you reviewer for the devtip :)
    Item.prototype.animateMarker =  ko.computed(() => { viewModel.currLocation() !== null ? viewModel.currLocation().marker.setAnimation(google.maps.Animation.BOUNCE) : null; }, this);

    // Loads locations from JSON-file, and map locations to items that are put in an observableArray
    $.ajax({
      url: CONST.url_locations,
      dataType: "json",
      success: function(response) {
        var arr = response.map(function(item) { return new Item(item); });
        arr.forEach(function(item){ viewModel.locations.push(item); });

        clearTimeout(loadRequestTimeout);
      }
    });

    this.setElementHeights();
  }  

/**
* Loads a wikipage and set up a KO variable with the pages main text.
* @param {string} wikiPage - a unique wikipage
*/
  loadData_Wiki (wikiPage) {
    var self = this;

    var wikiurl = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=' + wikiPage;

    $.ajax({
        url: wikiurl,
        dataType: "jsonp",
        success: function(response) {
          var pages = response.query.pages;
          var propertyNames = Object.keys(pages);
          self.currWikiText(pages[propertyNames[0]].extract);
        },
        error: function() { 
          self.currWikiText('failed to get wikipedia resources');
        },
        complete: function() {
          self.waitForAllResourcesAndShowLocationInfo();
        }
    });
  }

/**
* Loads a Flickr image
* @param {object} imgData - Flickr-data about image
*/
  loadFlickrImg (imgData) {
    var self = this;

    var imageData = {
      'href': imgData.url,
      'src': '',
      'alt': 'some image from flickr'
    };

    var URL = "https://api.flickr.com/services/rest/" + 
    "?method=flickr.galleries.getPhotos" +
    "&api_key=35ea935c9632cde77aec12c324007f6d" +
    "&gallery_id=" + imgData.album +
    "&format=json" +
    "&nojsoncallback=1";

    $.getJSON(URL, function(data) {
      // a check that the flickr gallery was found
      if(data.stat === 'ok') {
        var imageFound = false;

        $.each(data.photos.photo, function(i, item) {
          if(item.id == imgData.imgId) {
            imageData.src = "http://farm" + item.farm + ".static.flickr.com/" + 
              item.server + "/" + item.id + "_" + item.secret + "_n.jpg";
            imageFound = true;
          }
        });
        self.flickrImgFound(imageFound);
      }
      else {
        self.flickrImgFound(false);
      }

    })
    .error( function () {
      imageData.alt = 'failed to get flickr resources';
      viewModel.flickrImgFound(false);
    })
    .success( function () {
      imageData.alt = 'image from flickr';
    })
    .complete( function () {
      viewModel.currFlickrImageData( imageData );
      self.waitForAllResourcesAndShowLocationInfo(); 
    });
  }

/**
* Sets animation on locations google-map-marker.
* @param {object} location - location item
*/
  mouseOver (location) {
    location.marker.setAnimation(google.maps.Animation.BOUNCE);
  }

/**
* Nullify animation on locations google-map-marker, unless it´s the current location.
* @param {object} location - location item
*/
  mouseOut (location) {
    if(location !== viewModel.currLocation())
      location.marker.setAnimation(null);
  }
  
/**
* Every second time this function is called, viewModel.showLocationInfo() is set to true.
*/
  waitForAllResourcesAndShowLocationInfo () {
    if (this.flickrAndWiki_flag) {
      this.showLocationInfo(true);
      this.flickrAndWiki_flag = false;
    }
    else {
      this.flickrAndWiki_flag = true;
    }
  }

/**
* Sets viewModel.currLocation() to clicked location and/or sets viewModel.showLocationInfo()
*/
  locationButton_onClick  () {
    var self = this;
    // Current location clicked again hides the info-content element
    if(viewModel.currLocation() === self) {
      if(viewModel.showLocationInfo())
        viewModel.showLocationInfo(false);
      else
        viewModel.showLocationInfo(true);

      viewModel.currLocation(null);
    }
    // Else, new current location is set and resources called for
    else {
      viewModel.currLocation(self);
      viewModel.loadData_Wiki(self.wikiPage);
      viewModel.loadFlickrImg(self.flickrImg);
    }
  }

/**
* Set max-height of the location-info_content-wiki element so it does not exceed the viewport
*/
  setElementHeights () {
     var imgHeight = el_flickrImg.height;
     var screenSize = document.documentElement.clientHeight;

     this.maxheightWikiContentElement((screenSize - imgHeight) + 'px');
  }

/**
* When window resizes a new height for the location-info_content-wiki element is needed.
*/
  onResizeWindow () {
    viewModel.setElementHeights();
  }
  
/**
* Nullifies the current location and sets viewModel.showLocationInfo() to false
*/
  hideLocationInfo () {
    this.showLocationInfo(false);
    viewModel.currLocation(null);
  }

/**
* Error-event-handler for loading the google-map.
*/
  googleMapError () {
    this.isGoogleMapError(true);
  }

/**
* Reloads the page.
*/
  reloadPage () {
    location.reload();
  }
}


var viewModel = new ViewModel();
ko.applyBindings(viewModel);

var map;

/**
* Initializes the google-map object.
*/
var initMap = function () {
	map = new google.maps.Map(document.getElementById('map'), {
	    center: {lat: 58.475263, lng: 15.213411},
	    zoom: 6,
      disableDefaultUI: true
	});


// Google-map needs to exist when viewModel.init() is called.
	viewModel.init();
};


