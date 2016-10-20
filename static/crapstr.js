$(document).ready(function() {
	var map;
	var center;
	var markers = [];
	var infowindow = new google.maps.InfoWindow();
	var searchBar;

	function checkGeoLocation() {
		center = new google.maps.LatLng(41.8762686, -87.6322661);
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function(position) {
				center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
				initialize();
			}, function() {
				initialize();
			});
		} else {
			initialize();
		}
	}

	function initialize() {
	    var mapOptions = {
	      zoom: 15,
	      center: center,
	      clickableIcons: false,
	      mapTypeControl: false
	    };
	    map = new google.maps.Map(document.getElementById('map-canvas'),
	        mapOptions);

	    //Add controls
	    var pooButton = $('<div class="control" style="zIndex: 1;"><img src="static/graylet.png" /></div>');
	    pooButton.click(function() {
	    	if (!pooButton.hasClass('selected')) {
	    		$('.selected').removeClass('selected');
	    		pooButton.addClass('selected');

	    		clearMarkers();

	    		placeKnownMarkers();

	    		map.controls[google.maps.ControlPosition.TOP_CENTER].pop();
	    	}
	    });
	    var searchButton = $('<div class="control" style="zIndex: 1;"><img src="static/graylet.png" /></div>');
	    searchButton.click(function() {
	    	if (!searchButton.hasClass('selected')) {
	    		$('.selected').removeClass('selected');
	    		searchButton.addClass('selected');

	    		clearMarkers();

	    		if (!searchBar) {
	    			searchBar = $('<div class="control">'
	    							+ '<form>'
	    								+ '<input type="text" />'
	    								+ '<input type="submit" value="Search" />'
	    							+ '</form>'
	    						+ '</div>');
	    			searchBar.children().submit(function(event) {
	    				event.preventDefault();
	    				clearMarkers();
						var service = new google.maps.places.PlacesService(map);
					    var request = {
					    	location: map.getCenter(),
					    	radius: 5000,
					    	keyword: $(this).children('input[type=text]')[0].value
					    };
					    service.radarSearch(request, function(results, status) {
					    	if (status == google.maps.places.PlacesServiceStatus.OK) {
					    		results.forEach(function(result) {
					    			createToilet(result.geometry.location, result.place_id);
					    		});
					    	}
					    });
	    			});
	    		}

	    		map.controls[google.maps.ControlPosition.TOP_CENTER].push(searchBar[0]);
	    		searchBar.find('input[type=text]').focus();
	    	}
	    });
	    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(searchButton[0]);
	    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(pooButton[0]);

	    pooButton.click();
	}

	function placeKnownMarkers() {
		$.ajax({
			url: '/location',
			dataType: 'json',
			data: {lat: map.getCenter().lat(), lon: map.getCenter().lng()}
		}).done(function(data) {
			data.forEach(function(row) {
				createToilet(new google.maps.LatLng(row.lat,row.lon), row.placeId);
			});
		});
	}

	function createToilet(loc, placeId) {
		var marker = new google.maps.Marker({
			position: loc,
			icon: "static/graylet.png",
			map: map
		});
		markers.push(marker);

		google.maps.event.addListener(marker,'click',function() {
			postReviews(loc, placeId, function() {
				infowindow.open(map, marker);
			});
		});
	}

	function postReviews(loc, placeId, f) {
		$.ajax({
			url: '/reviews/'+placeId,
			dataType: 'json'
		}).done(function(data) {
			var content = '';
			var isNew = false;
			if (data.reviews.length) {
				data.reviews.forEach(function(review) {
					content += "<hr><div><p class='rating star-" + review.rating + "'/><p><b>Description</b>: " + review.description + "</p></div>";
				});
				content = "<div><p class='rating star-" + String(data.avg).replace('.','-') + "'/></div>" + content;
			} else {
				content = "No reviews yet! Be the first to review this terlet!";
				isNew = true;
			}
			content = $("<div class='infowindow_container'>" + content + "<div class='button'>Add Review</div></div>");
			content.children('.button').click(function() {
				createSubmissionForm(content[0], isNew, loc, placeId);
			});
			infowindow.setContent(content[0]);
			f();
		});
	}

	function clearMarkers() {
		markers.forEach(function(marker) {
			marker.setMap(null);
		});
		markers = [];
	}

	function createSubmissionForm(oldContent, isNew, loc, placeId) {
		var content = $("<div class='infowindow_container'>"
						+ "<div class='rating star-0'>"
							+ "<div></div>"
							+ "<div></div>"
							+ "<div></div>"
							+ "<div></div>"
							+ "<div></div>"
						+ "</div>"
						+ "<p><b>Description</b>: <input type='text' /></p>"
						+ "<div class='cancel button'>Cancel</div>"
						+ "<div class='submit button'>Submit</div>"
					  + "</div>");
		var rating = 0;
		content.find('.rating div').mouseover(function() {
			content.children('.rating').removeClass().addClass('rating star-' + String($(this).index() + 1));
		});
		content.find('.rating div').mouseout(function() {
			content.children('.rating').removeClass().addClass('rating star-' + rating);
		});
		content.find('.rating div').click(function() {
			rating = $(this).index() + 1;
		});
		content.find('.cancel').click(function() {
			infowindow.setContent(oldContent);
		});		
		content.find('.submit').click(function() {
			if (isNew) {
				$.ajax({
					url: '/location',
					method: 'post',
					data: {placeId: placeId, lon: loc.lng(), lat: loc.lat(), description: content.find('input[type=text]')[0].value, rating: rating}
				}).done(function() {
					postReviews(loc, placeId, function() {});
				});
			} else {
				$.ajax({
					url: '/reviews',
					method: 'post',
					data: {placeId: placeId, description: content.find('input[type=text]')[0].value, rating: rating}
				}).done(function() {
					postReviews(loc, placeId, function() {});
				});
			}
			//console.log({, loc: loc,,});
		});

		infowindow.setContent(content[0]);
	}

	google.maps.event.addDomListener(window, 'load', checkGeoLocation);
});