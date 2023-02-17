(function ($) {
    'use strict';

    /*------------- preloader js --------------*/
	function loader() {
		$(window).on('load', function () {
			
		});
	}
	loader();

	$(window).on("load", function () {
		background();
	});

    // background image js
	function background() {
			var img=$('.bg_img');
			img.css('background-image', function () {
			var bg = ('url(' + $(this).data('background') + ')');
			return bg;
		});
	}

	// active mobile-menu
	jQuery('#main-menu').meanmenu({
		meanScreenWidth: '991',
		meanMenuContainer: '.mobile-menu'
	});

	// brand
	var brand = $('.brand');
	brand.owlCarousel({
		loop: true,
		margin: 30,
		loop: true,
		slideSpeed: 3000,
		nav: false,
		dots: false,
		responsiveClass:true,
		responsive: {
			0: {
				items: 1,
				margin: 0
			},
			768: {
				items: 2
			},
			1200: {
				items: 3
			},
			1500: {
				items: 4
			}
		}
	});

	// brand
	var testimonial = $('.testimonial');
	testimonial.owlCarousel({
		items:1,
		loop: true,
		margin: 0,
		loop: true,
		slideSpeed: 3000,
		nav: false,
		dots: false,
	});


	// isotop active
	$('.work-lists').imagesLoaded(function () {
		// init Isotope
		var $grid = $('.work-lists').isotope({
			itemSelector: '.grid-item',
			percentPosition: true,
			masonry: {
				// use outer width of grid-sizer for columnWidth
				columnWidth: '.grid-sizer'
			}
		});

		// filter items on button click
		$('.work-nav ul').on('click', 'li', function () {
			var filterValue = $(this).attr('data-filter');
			$grid.isotope({ filter: filterValue });
		});

	});

	//for menu active class
	$('.work-nav ul li').on('click', function (event) {
		$(this).siblings('.active').removeClass('active');
		$(this).addClass('active');
		event.preventDefault();
	});

	// Activate lightcase
	$('a[data-rel^=lightcase]').lightcase();

	// Active wow js
	new WOW().init();

	marked.setOptions({
		renderer: new marked.Renderer(),
		gfm: true,
		tables: true,
		breaks: true,
		pedantic: true,
		sanitize: true,
		smartLists: true,
		smartypants: true,
		highlight: function (code,lang) {
			return hljs.highlightAuto(code,[lang]).value;
		}
	});

	let text = marked.parse($("#markdown").text());
	$("#markdown").html(text);
})(jQuery);

