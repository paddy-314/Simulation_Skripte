var __blok_dialogs = {};

function blokStoreDialogObject(id, dia) {
	if (__blok_dialogs[id] == null) {
		__blok_dialogs[id] = dia;
	}
}

function blokGetDialogObject(id) {
	return __blok_dialogs[id];
}

function blokRemoveDialogObject(id) {
	return __blok_dialogs[id] = null;
}

function onyxRefreshDnD() {
	if (!jQuery(".dragCont.ui-draggable").length) { // do not render DND through refresh before it was initially rendered (and maybe is still waiting for MathJax to finish)
		return;
	}
	const im = jQuery(".interaction-match");
	im.css("width", im.width() + 1);
	jQuery(".interaction-order .order-element").each(function (index, element) {
		const el = jQuery(this);
		el.css("width", el.width() + 1);
	});
	jQuery(".matchDNDinitField").each(function (index, element) {
		const script = jQuery(element).val();
		eval(script);
	});
}

function onyxRenderMathInDocument() {
	MathLive.renderMathInDocument({
		// Elements with a class of "instruction" or "source will be skipped
		TeX: {
			delimiters: {
				// Allow math formulas surround by $...$ or \(...\)
				// to be rendered as textstyle content.
				inline: [
					['$$', '$$'],
					['$', '$'],
					['\\(', '\\)'],
				],
				display: [
					// ['$', '$'],
					// ['$$', '$$'],
					// ['\\(', '\\)'],
				],
			},
		},
	});
}

function onyxGraphicGapMatch(contentid, spotContainerId, optContainerId, storeId, width, height, disabled, debug) {
	const container = jQuery("#" + contentid);
	const spotContainer = jQuery("#" + spotContainerId);
	const optContainer = jQuery("#" + optContainerId);
	/** Adds the given values to the given string and returns the result */
	const add = function (drop, drag, val) {
		let newVal = val;
		if (newVal.length > 0) newVal += "\n";
		newVal += drop + "°" + drag + "°";
		return newVal;
	};
	/**
	 * Checks if the id is part of val.
	 * @param id ID to check.
	 * @param val Value to check in
	 * @returns {boolean}
	 */
	const isIn = function(id, val) {
		const lookup = id + "°";
		return val.indexOf(lookup) > -1;
	};
	/**
	 * Does the relative calculation of the element move and moves it.
	 * @param el2move jQuery element to move animatedly.
	 * @param destination jQuery element. Destination to move that element to.
	 * @param fast Faster animation
	 */
	const moveTile = function(el2move, destination, fast) {

		const relate = destination.hasClass('option') ? 0 : 5;

		// calculate top
		const ot = el2move.parent().position().top;
		const dt = destination.position().top;
		const nt = dt - ot - relate;

		// calculate left
		const ol = el2move.parent().position().left;
		const dl = destination.position().left;
		const nl = dl - ol - relate;

		if (debug) {
			console.log(el2move.position().top + "->" + destination.position().top);
			console.log(el2move.position().left + "->" + destination.position().left);

			console.log(ot + "-" + dt + "-" + nt);
			console.log(ol + "-" + dl + "-" + nl);
		}
		el2move.animate({
			"top" : nt,
			"left" : nl
		}, fast ? 100 : 1000);
	};
	// event handler called on drop events
	const ggmAfter = function(debug, event, ui, droppable, isSpot) {
		const dragId = ui.draggable.attr('id');
		const dropId =    droppable.attr('id');

		const stuffs = jQuery("#" + storeId);
		let val = stuffs.val();
		let newVal = "";

		let move = null;
		let lines = val.split("\n");

		// get source of dragged element
		let src = null;
		jQuery(lines).each(function(index) {
			let line = this;
			const srcEnd = line.indexOf(dragId + "°");
			if (srcEnd > 5) {
				src = line.substring(0, srcEnd - 1);
			}
		});

		// handle drop event
		jQuery(lines).each(function(index) {
			let line = this;
			if (line.startsWith(dropId + "°")) { // destination is already assigned
				// check if the destination spot is not already assigned. If, than move the former assigned item back to the origin of dropped item
				move = line; // remember for animation
			} else if (line.indexOf(dragId + "°") < 0) { // not the thing currently dragged
				// this checks the current assignments and removed all former assignments of the element just dropped
				if (newVal.length > 0) newVal += "\n";
				newVal += line; // keep that thing
			}
		});

		// if there already was another element, move it back to the source of the just moved element
		if (move != null) {
			if (debug) {
				console.log(src);
				console.log(move);
			}
			const elIdStart = move.indexOf("°");
			const elId = move.substring(elIdStart + 1, move.length - 1);
			let destination;
			if (src != null) { // dropped element came from a spot
				newVal = add(src, elId, newVal);
				destination = jQuery(container).find("#" + src);
			} else { // dropped element came from an option container below image
				// get first free option container to move element to
				let found = null;
				jQuery("#" + contentid + " .ia_graphic_gap_match.option div.tile").each(function(index, element) {
					const id = jQuery(element).attr('id');
					const a = newVal !== "" && isIn(id, newVal);
					let b = false;
					if (newVal === "") {
						jQuery(lines).each(function(index) {
							let line = this;
							if (!b) {
								b = isIn(id, line);
							}
						});
					}
					if (found == null && (a || b)) {
						found = jQuery(element).parent().attr('id');
					}
				});
				destination = jQuery("#" + found);
			}

			// animate element with ID elId back to destination
			const el2move = jQuery(container).find("#" + elId);
			moveTile(el2move, destination, false);
		}

		// if currently dropped thing is not stored yet and was not dropped on an option container
		if (!isIn(dragId, newVal) && isSpot) {
			newVal = add(dropId, dragId, newVal);
		}

		moveTile(jQuery("#" + dragId), droppable, false);

		stuffs.val(newVal);
		stuffs.trigger("change"); // send to server
	};

	const padding = 5;       // padding of option elements
	const border = 1;        // border of option elements
	const margin = 5;        // margin of option elements

	/** All spots and options */
	const all = container.find("div.spot div.tile,div.option div.tile");
	// get max size of spots
	let maxSpotWidth = width != null ? width : 0;
	let maxSpotHeight = height != null ? height : 0;
	// wait for images to load
	let comp = true;
	all.each(function(index, element) {
		let imgs = jQuery(element).find('img');
		imgs.each(function(index1, element1) {
			let img = jQuery(element1);
			if (debug) {
				console.log(img);
				console.log(img.prop('complete'));
			}
			if (!img.prop('complete')) {
				comp = false;
			}
		});
	});
	if (!comp) {
		window.setTimeout(onyxGraphicGapMatch, 250, contentid, spotContainerId, optContainerId, storeId, width, height, disabled, debug);
		return;
	}
	all.each(function(index, element) {
		if (width == null) {
			let w = jQuery(element).width();
			if (w > maxSpotWidth) maxSpotWidth = w;
		}
		if (height == null) {
			let h = jQuery(element).height();
			if (h > maxSpotHeight) maxSpotHeight = h;
		}
	});
	/** Set spots and options as well as option containers to max size */
	all.each(function(index, element) {
		const div = jQuery(element);

		// resize spots and options
		div.width(maxSpotWidth);
		div.height(maxSpotHeight);

		// resize spot and option containers
		const parent = div.parent();
		let outerWidth = maxSpotWidth + padding - 2 * border;
		let outerHeight = maxSpotHeight + 2 * border;
		if (parent.hasClass("spot")) { // spots do not have a padding, so add it so size to fit option elements
			outerWidth  += padding;
			outerHeight += padding;
		}
		parent.width(outerWidth);
		parent.height(outerHeight);
	});

	// make options draggable
	container.find("div.option div.tile").each(function(index, element) {
		if (debug) console.log('Make options draggable: ' + element.id);
		jQuery(element).draggable({
			containment : container,
			revert : 'invalid',
			scope : contentid,
			disabled : disabled,
			opacity: 0.35
		});
		initTouch(jQuery(element));
	});

	// make destination spots droppables
	container.find("div.spot").each(function(index, element) {
		if (debug) console.log('Make spots droppable: ' + element.id);
		jQuery(element).droppable({
			accept : "#" + contentid + " .ia_graphic_gap_match",
			scope : contentid,
			disabled : disabled,
			drop : function(event, ui) {
				ggmAfter(debug, event, ui, jQuery(this), true);
			}
		});
	});
	// make option divs droppable (if element should be dragged back)
	container.find("div.option").each(function(index, element) {
		if (debug) console.log('Make options droppable: ' + element.id);
		jQuery(this).droppable({
			accept : "#" + contentid + " .ia_graphic_gap_match",
			scope : contentid,
			disabled : disabled,
			drop : function(event, ui) {
				ggmAfter(debug, event, ui, jQuery(this), false);
			}
		});
	});

	const initial = jQuery("#" + storeId).val();
	if (initial != null && initial.length > 0) {
		// move option elements to spots
		let lines = initial.split("\n");

		// get source of dragged element
		jQuery(lines).each(function(index) {
			let line = this;

			// line starts with destination ID (spot)
			let destEnd = line.indexOf("°");
			if (destEnd > 5) {
				let destId = line.substring(0, destEnd);

				// now get source ID (option)
				let srcEnd = line.lastIndexOf("°");
				if (srcEnd === line.length - 1) {
					let srcId = line.substring(destEnd + 1, srcEnd);
					window.setTimeout(function() {moveTile(jQuery("#" + srcId), jQuery("#" + destId), true)}, 500);
				}
			}
		});
	}
}

function onyxInitDnD(itemId, minWidth, minHeight, elementCount, useThreeColumnsLayout, horizontal, swap, disabled,
		min, max, minhintid, maxhintid,
		appendImgOnLoad, debug) { // these both param MUST be the last ones!
	const q = itemId + ' '; // the itemContainers id as jQuery preSelector
	if (debug) console.log('Using element prefix ' + q);

	const padding = 5;       // padding of src, target and dest elements
	const margin = 6;        // margin of src, target and dest elements
	const betweenWidthL = 30;// width of left between element
	const betweenWidthR = 4;// width of right between element

	let maxWidth = minWidth;
	let maxHeight = minHeight;
	if (appendImgOnLoad) {
		// append a onLoad handler for images, which were lazily loaded (not catch by onDomReady in AJAX request case)
		jQuery(q + '.dragCont img').each(function(index, element) {
			jQuery(this).on("load", function () {
				onyxRefreshDnD();
			});
		});
		if (useThreeColumnsLayout) {
			jQuery(q + '.targetCont img').each(function(index, element) {
				jQuery(this).on("load", function () {
					onyxRefreshDnD();
				});
			});
		}
	}

	/*
	 * Handle target elements widths. In case of very short elements, these elements should have some
	 * min-width. But for long floating texts, restrict to some initial width, otherwise the browser
	 * will take the complete screen to render them, which causes large elements... ONYX-4429
	 */
	if (useThreeColumnsLayout && !horizontal) {
		let tgtWidth = 0;
		jQuery(q + '.targetCont').each(function(index, element) {
			const w = jQuery(element).width();
			if (w > tgtWidth) {
				tgtWidth = w;
			}
		});
		if (tgtWidth > 301) {
			tgtWidth = 301;
			jQuery(q + '.targetCont').each(function (index, element) {
				jQuery(element).width(tgtWidth);
			});
		}
	}

	let horizontalImgHeightD = 0; // in case of horizontal layout and non-image draggables, but images in 1st row, we need to take care of these images heights
	let horizontalImgHeightT = 0; // in case of horizontal layout and non-image targets   , but images in 3rd row, we need to take care of these images heights
	// get max drag and target elements width and height
	jQuery(q + '.dragCont').each(function (index, element) {
		if (debug) console.log('$(' + q + '.dragCont).each ' + index + ',' + element.id);
		// check element itself
		let w = jQuery(element).width();
		if (w > maxWidth) {
			maxWidth = w;
			if (debug) console.log('maxDragWidth 1: ' + maxWidth);
		}
		w = jQuery(element).height();
		if (w > maxHeight)
			maxHeight = w;
		// check image children
		jQuery(element).find('img').each(function(index1, element1) {
			const w1 = jQuery(element1).width();
			if (w1 > maxWidth) {
				maxWidth = w1;
				if (debug) console.log('maxDragWidth 2: ' + maxWidth);
			}
			const w2 = jQuery(element1).height();
			if (w2 > maxHeight)
				maxHeight = w2;
			if (w2 > horizontalImgHeightD && horizontal) {
				horizontalImgHeightD = w2;
			}
			if (debug && horizontal) {
				console.log('dc img height: ' + w2)
			}
		});
	});
	let maxWidthTarget = 0;
	if (useThreeColumnsLayout) {
		jQuery(q + '.targetCont').each(function(index, element) {
			if (debug)  console.log('$(' + q + '.targetCont).each ' + index + ',' + element.id);
			// check element itself
			const w = jQuery(element).width();
			if (w > maxWidth && horizontal) {
				maxWidth = w;
				if (debug) console.log('maxTargetWidth 1: '+maxWidth);
			}
			if (w > maxWidthTarget) {
				maxWidthTarget = w;
			}
			const h = jQuery(element).height();
			if (h > maxHeight && (!horizontal || swap))
				maxHeight = h;
			// check image children
			jQuery(element).find('img').each(function(index1, element1) {
				const w1 = jQuery(element1).width();
				if (w1 > maxWidth && horizontal) {
					maxWidth = w1;
					if (debug) console.log('maxTargetWidth 2: ' + maxWidth);
				}
				if (w > maxWidthTarget) {
					maxWidthTarget = w;
				}
				const w2 = jQuery(element1).height();
				if (w2 > maxHeight && (!horizontal || swap))
					maxHeight = w2;
				if (w2 > horizontalImgHeightT && horizontal) {
					horizontalImgHeightT = w2;
				}
				if (debug && horizontal) {
					console.log('tc img height: ' + w2)
				}
			});
		});
	}
	// set drag source and drop destination container elements width and height to all the same values
	jQuery(q + '.srcCont').each(function(index, element) {
		if (debug) console.log('$(' + q + '.srcCont).each ' + index + ',' + element.id);
		jQuery(element).css('width',  maxWidth + 8);
		jQuery(element).css('height', maxHeight + 8);
	});
	jQuery(q + '.destCont').each(function(index, element) {
		if (debug) console.log('$(' + q + '.destCont).each ' + index + ',' + element.id);
		jQuery(element).css('width',  maxWidth + 8);
		jQuery(element).css('height', maxHeight + 8);
	});
	if (useThreeColumnsLayout) {
		jQuery(q + '.targetCont').each(function(index, element) {
			if (debug) console.log('$(' + q + '.targetCont).each ' + index + ',' + element.id);
			if (horizontal) {
				// for vertical rendering there is no restriction of the target elements width
				jQuery(element).css('width', maxWidth + 8);
			}
			jQuery(element).css('height', maxHeight + 8);
		});
	}

	let contWidth = 0;
	if (horizontal) {
		// set container width for horizontal display
		contWidth = (maxWidth + 60) * elementCount;
		jQuery(q + '.srcs').css('width', contWidth);
		jQuery(q + '.srcs').css('height', maxHeight + 28);
		jQuery(q + '.dest').css('width', contWidth);
		jQuery(q + '.dest').css('height', maxHeight + 28);
		jQuery(q + '.target').css('width', contWidth);
		jQuery(q + '.srcs').parents('.interaction-match').css('width', contWidth);
	} else {
		contWidth = (maxWidth + 60) * 2 + (useThreeColumnsLayout ? maxWidthTarget : 0) + 120;
		// set container width for vertical display
		jQuery(q + '.srcs').parents('.interaction-match').css('width', contWidth);
	}
	const horizontalHeight = (maxHeight > horizontalImgHeightT ? maxHeight : horizontalImgHeightT) + (maxHeight > horizontalImgHeightD ? maxHeight : horizontalImgHeightD) + maxHeight;
	const contHeight = horizontal ? (horizontalHeight + 90) : ((maxHeight + 20) * elementCount);
	jQuery(q + '.srcs').parents('.interaction-match').css('height', contHeight);


	jQuery(q + '.showSolImg').each(function (index, element) {
		if (debug) console.log('$(' + q + '.showSolImg).each ' + index + ',' + element.id);
		jQuery(element).css('margin-top', ((maxHeight + 0) / 2 + padding - 10) + 'px');
	});
	// set drag and drop container elements width and height to all the same values
	jQuery(q + '.dragCont').each(function (index, element) {
		if (debug) console.log('$(' + q + '.dragCont).each ' + index + ',' + element.id);
		jQuery(element).css('min-width',  maxWidth);
		jQuery(element).css('height', maxHeight);

		/* set absolute position */
		const dci = onyxGetItemIdFromHtmlId(element); // the drag containers id
		if (debug) console.log('dci: ' + dci);

		const destEl = onyxGetSourceElWhichContainedIdAndClearIt(q, dci, false);
		if (debug) console.log('destEl: ' + destEl);
		const sc = destEl.parentNode;//jQuery('#sc_' + dci);
		const top_offset = jQuery(sc).offset().top;
		const left_offset = jQuery(sc).offset().left;
		const top_position = jQuery(sc).position().top;
		const left_position = jQuery(sc).position().left;

		jQuery(element).css({
			position : 'absolute',
			top : top_position + 10,
			left : left_position + 10,
			float : ''
		});
	});

	if (debug) {
		console.log('useThreeColumnsLayout: ' + useThreeColumnsLayout);
		console.log('contWidth: ' + contWidth);
		console.log('maxWidth: ' + maxWidth);
		console.log('maxHeight: ' + maxHeight);
		console.log('horizontalImgHeight drag: ' + horizontalImgHeightD);
		console.log('horizontalImgHeight trgt: ' + horizontalImgHeightT);
		console.log('padding: ' + padding);
		console.log('margin: ' + margin);
		console.log('betweenWidthL: ' + betweenWidthL);
	}

	// make draggable
	jQuery(q + '.dragCont').each(function(index, element) {
		if (debug) console.log('Make $(' + q + '.dragCont) draggable: ' + element.id);
		jQuery(this).draggable({
			containment : jQuery(itemId), // was "itemContainer"
			revert : 'invalid',
			scope : itemId,
			disabled : disabled,
			opacity: 0.35
		});
		initTouch(jQuery(element));
	});
	// make destination divs droppables
	jQuery(q + '.destCont').each(function(index, element) {
		if (debug) console.log('Make $(' + q + '.destCont) droppable: ' + element.id);
		jQuery(this).droppable({
			accept : q + '.dragCont',
			scope : itemId,
			disabled : disabled,
			drop : function(event, ui) {
				afterDrop(q, debug, event, ui, jQuery(this), true, min, max, minhintid, maxhintid);
			}
		});
	});
	// make source divs droppable (if element should be dragged back)
	jQuery(q + '.srcCont').each(function(index, element) {
		if (debug) console.log('Make $(' + q + '.srcCont) droppable: ' + element.id);
		jQuery(this).droppable({
			accept : q + '.dragCont',
			scope : itemId,
			disabled : disabled,
			drop : function(event, ui) {
				afterDrop(q, debug, event, ui, jQuery(this), false, min, max, minhintid, maxhintid);
			}
		});
	});
}

function afterDrop(q, debug, event, ui, droppable, isDest, min, max, minhintid, maxhintid) {
	const drag_id = ui.draggable.attr('id');
	if (debug) console.log('Entering afterDrop for ' + drag_id);
	const top = droppable.offset().top; // top position of droppable
	const left = droppable.offset().left;
	if (isDest) {
		/*
		 * Dragged element was dropped on a destination droppable
		 */
		const drId = onyxGetItemIdFromHtmlId(ui.draggable); // id of the draggable
		const deId = onyxGetItemIdFromHtmlId(droppable); // id of the destination droppable
		// delete dragged id from source hidden field
		let schEl = onyxGetSourceElWhichContainedIdAndClearIt(q, drId, true); // the source hidden field element
		if (debug) console.log('afterDrop: drId >' + drId + '<,deId >' + deId + '<,schEl.id >' + schEl.id + '<');
		/*
		 * now the draggable id will be saved in droppable hidden field, but droppable may already contain a draggable which was assigned to this droppable before, so move it back to a free source (schEl
		 * contains source of the element just dropped, its source should be free)
		 */
		let full = jQuery(q + '#dch_' + deId).val(); // the id of draggable which was dropped at this destination before
		if (debug) console.log('afterDrop: full >' + full + '<');
		if (full !== '') { // yes, here was sth. dropped before
			onyxMoveAssignedElementToPositionOfJustDropped(q, schEl, full);
		}
		// store dragged id in destination hidden field
		jQuery(q + '#dch_' + deId).val(drId);
		jQuery(q + '#dch_' + deId).trigger('change');
	} else {
		/*
		 * Dragged element was dropped on a source droppable
		 */
		// store id in hidden field
		const dragId = onyxGetItemIdFromHtmlId(ui.draggable); // id of the draggable
		const dropId = onyxGetItemIdFromHtmlId(droppable); // id of the droppable
		const schEl = onyxGetSourceElWhichContainedIdAndClearIt(q, dragId, true); // the source hidden field element of the dropped element
		if (debug) console.log('afterDrop: dragId >' + dragId + '<,dropId >' + dropId + '<,schEl.id >' + schEl.id + '<');
		const full = jQuery(q + '#sch_' + dropId).val(); // the id of draggable which was dropped at this destination before
		if (debug) console.log('afterDrop: full >' + full + '<');
		if (full !== '') { // yes, here was sth. dropped before
			onyxMoveAssignedElementToPositionOfJustDropped(q, schEl, full);
		}
		jQuery(q + '#sch_' + dropId).val(dragId);
		jQuery(q + '#sch_' + dropId).trigger('change');
	}

	const top_offset = jQuery(droppable).offset().top;
	const left_offset = jQuery(droppable).offset().left;
	const top_position = jQuery(droppable).position().top;
	const left_position = jQuery(droppable).position().left;
	setDraggablePositionAnimated(q, drag_id, top_position + 10, left_position + 10, 300, true); // and move back the 'old' droppable

	if (min > 0 || max > 0) {
		let cnt = 0;
		jQuery(q + 'input.dch').each(function(index, element) {
			// count associations
			const val = jQuery(element).val();
			if (val !== '') {
				++cnt;
			}
		});
		if (min > 0 && minhintid != null) {
			const jqminhintid = jQuery('#'+minhintid);
			if (cnt < min) {
				jqminhintid.removeClass('maxMsgHint');
				jqminhintid.addClass('maxMsgAlert');
			} else {
				jqminhintid.addClass('maxMsgHint');
				jqminhintid.removeClass('maxMsgAlert');
			}
		}
		if (max > 0 && maxhintid != null) {
			const jqmaxhintid = jQuery('#'+maxhintid);
			if (cnt > max) {
				jqmaxhintid.removeClass('maxMsgHint');
				jqmaxhintid.addClass('maxMsgAlert');
			} else {
				jqmaxhintid.addClass('maxMsgHint');
				jqmaxhintid.removeClass('maxMsgAlert');
			}
		}
	}

	//droppable.effect("pulsate", { times : 3 }, 300);
}

/**
 * Moves the element already assigned to the source element to the source of the newly dropped element
 */
function onyxMoveAssignedElementToPositionOfJustDropped(q, schEl, full) {
	const schId = jQuery(schEl).attr('id');
	const fromSrc = schId.indexOf('sch') === 0; // element was dragged from a source element
	jQuery(schEl).val(full); // move it back to the source of the draggable which was just dropped
	jQuery(schEl).trigger('change');
	const sc = jQuery(q + (fromSrc ? '#sc_' : '#de_') + onyxGetItemIdFromHtmlId(schEl)); // get the source of the dropped draggable (which is free now)
	const top_offset = jQuery(sc).offset().top;
	const left_offset = jQuery(sc).offset().left;
	const top_position = jQuery(sc).position().top;
	const left_position = jQuery(sc).position().left;
	setDraggablePositionAnimated(q, ('dc_' + full), top_position + 10, left_position + 10, 300, false); // and move back the 'old' droppable
}

/**
 * Gets the source hidden field which contained the draggable id given as param and clears this hidden field.
 */
function onyxGetSourceElWhichContainedIdAndClearIt(q, drId, clear) {
	let wasDraggedFromHiddenField = null;
	jQuery(q + '.sch').each(function(index, element) { // look up source field which did contain the draggable before drop
		const schValTmp = jQuery(element).val();
		if (schValTmp === drId) {
			wasDraggedFromHiddenField = element;
			if (clear) jQuery(element).val('');
		}
	});
	if (wasDraggedFromHiddenField == null) { // was not dragged from a source field
		jQuery(q + '.dch').each(function(index, element) { // look up source field which did contain the draggable before drop
			const dchValTmp = jQuery(element).val();
			if (dchValTmp === drId) {
				wasDraggedFromHiddenField = element;
				if (clear) jQuery(element).val('');
				jQuery(element).trigger('change');
			}
		});
	}
	return wasDraggedFromHiddenField;
}

function setDraggablePositionAnimated(q, id, top, left, speed, isEffect) {
	const obj = jQuery(q + "#" + id).animate({
		"top": top,
		"left": left
	}, speed);
	if (isEffect) {
		obj.effect("highlight", {
			times : 1
		}, 300);
	}
}

function onyxGetItemIdFromHtmlId(element) {
	let dci = jQuery(element).attr('id'); // the drag containers id
	dci = dci.substring(dci.indexOf("_") + 1);
	return dci;
}

function onyxIsVisible(elem) {
	//special bonus for those using jQuery
	if (typeof jQuery === "function" && elem instanceof jQuery) {
		elem = elem[0];
	}

	const rect = elem.getBoundingClientRect();

	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
		rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
	);
	/*
	var docViewTop = jQuery(window).scrollTop();
	var docViewBottom = docViewTop + jQuery(window).height();
	
	var off = jQuery(elem).offset();
	if (off === undefined) { // jQuery does not support offset of hidden elements
		return true;
	}
	
	var elemTop = off.top;
	var elemBottom = elemTop + jQuery(elem).height();
	
	return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom));*/
}

function onyxMinMaxCounter(el,hiddenCntMarkupId) {
	var varCnt = parseInt(document.getElementById(hiddenCntMarkupId).value);
	if (el.checked) {
		varCnt++;
	} else {
		varCnt--;
	}
	document.getElementById(hiddenCntMarkupId).value = varCnt;
}

function onyxMinMaxMin(el, hiddenMinMarkupId, hiddenMaxMarkupId, hiddenCntMarkupId, minHintMarkupId) {
	var varMin = parseInt(document.getElementById(hiddenMinMarkupId).value);
	var varMax = parseInt(document.getElementById(hiddenMaxMarkupId).value);
	var varCnt = parseInt(document.getElementById(hiddenCntMarkupId).value);
	var overrideAlert = false;
	if (varMin != varMax && !el.checked) {
		if (varCnt < varMin) {
			el.checked = true;
			++varCnt;
			overrideAlert = true;
		}
	}
	if (overrideAlert || varCnt < varMin) {
		document.getElementById(minHintMarkupId).className = 'maxMsgAlert';
	} else {
		document.getElementById(minHintMarkupId).className = 'maxMsgHint';
	}
	document.getElementById(hiddenCntMarkupId).value = varCnt;
}

function onyxMinMaxMax(el, hiddenMinMarkupId, hiddenMaxMarkupId, hiddenCntMarkupId, maxHintMarkupId) {
	var varMin = parseInt(document.getElementById(hiddenMinMarkupId).value);
	var varMax = parseInt(document.getElementById(hiddenMaxMarkupId).value);
	var varCnt = parseInt(document.getElementById(hiddenCntMarkupId).value);
	var overrideAlert = false;
	if (varMin != varMax && el.checked) {
		if (varMax > 0 && varCnt > varMax) {
			el.checked = false;
			--varCnt;
			overrideAlert = true;
		}
	}
	if (overrideAlert || varMax > 0 && varCnt > varMax) {
		document.getElementById(maxHintMarkupId).className = 'maxMsgAlert';
	} else {
		document.getElementById(maxHintMarkupId).className = 'maxMsgHint';
	}
	document.getElementById(hiddenCntMarkupId).value = varCnt;
}

function onyxUpdateTimer(hiddenId, minId, secId, down) {
	const hiddelEl = document.getElementById(hiddenId);
	if (hiddelEl == null) {
		window.setTimeout("onyxUpdateTimer('" + hiddenId + "','" + minId + "','" + secId + "'," + down + ")", 990);
		return;
	}
	let tm = parseInt(''+hiddelEl.value, 10);
	if (tm < 0) {
		return;
	}
	const secs = tm % 60;
	const mins = (tm - secs) / 60;
	document.getElementById(minId).innerHTML = (''+mins);
	document.getElementById(secId).innerHTML = (secs<10?('0'+secs):(''+secs));
	if (tm > 0) {
		tm = down ? (tm - 1) : (tm + 1);
		hiddelEl.value = tm;
		window.setTimeout("onyxUpdateTimer('" + hiddenId + "','" + minId + "','" + secId + "'," + down + ")", 990); // ten ms buffer to avoid server time being faster than client time
	}
}

function onyxInitNavtreeSlider(testId, treeContainerId, contentContainerId) {
	jQuery('#'+treeContainerId).resizable({
		handles: 'e', // navtree is resizable on right
		minWidth: 100,
		maxWidth: 400,
		// autoHide: true, // hide handle automatically until mouseover
		ghost: true, // real time preview
		helper: 'ui-state-highlight', // highlight during resizing
		// animate: true,
		// resizing animation -> does not work with margin-left adopting in stop event handler b/c offsetWidth is red before animation end
		stop: function(event, ui) { // adopt margin-left of content panel according to resizing
			var treeEl = onyxAdoptContentToTree(treeContainerId, contentContainerId);
			if (testId != null) {
				document.cookie = testId + 'treewidth=' + treeEl.offsetWidth;
			}
		}
	});
	if (testId != null) {
		var treeWidth = getCookie(testId + 'treewidth');
		if (treeWidth != null) {
			var treeeEl = document.getElementById(treeContainerId);
			treeeEl.style.width = treeWidth + 'px';
		}
	}
	onyxAdoptContentToTree(treeContainerId, contentContainerId);
}

function onyxAdoptContentToTree(treeContainerId, contentContainerId) {
	var contEl = document.getElementById(contentContainerId);
	var treeEl = document.getElementById(treeContainerId);
	var ml = treeEl.offsetWidth;
	contEl.style.marginLeft = ml + 'px';
	treeEl.style.height = '';
	ml += 0;
	jQuery('.header-container').each(function(index, element) {jQuery(this).css('left', ml);});
//	jQuery('.sub-nav-container').each(function(index, element) {jQuery(this).css('left', ml);});
	onyxRefreshDnD(); // refresh DND interaction elements
	return treeEl;
}

function onyxCheckTextentry(el, min, max, minText, maxText) {
	if (el == null) return;
	var len = el.value.length;
	var showMin=min > 0 && min > len;
	var showMax=max > 0 && max < len;
	if (!showMin && !showMax) {
		el.title = '';
		el.className = 'textentry_input';
	} else if (showMin) {
		el.title = minText;
		el.className = 'textentry_input_err';
	} else {
		el.title = maxText;
		el.className = 'textentry_input_err';
	}
}

function onyxScrollToItem(itemId) {
	onyxScrollToElement("a[name=\"" + itemId + "\"]");
}

function onyxScrollToElement(selector) {
	var e = document.querySelector(selector);
	if (e === null) {
		return;
	}
	e.scrollIntoView();
	//{behavior: "smooth"}
	var newY = window.scrollY;
	if (newY) {
		var hc = document.querySelector(".header-container");
		if (hc) {
			var header = hc.scrollHeight;
			window.scroll(0, newY - header);
		}
	}
}

var onyxtextEntryValidatorMessageClass = 'iaTextEntryValError';

/**
 * Appends a validator to the input field identified by the given id.
 * @param markupId HTML ID of the input element
 * @param jsVarName Name of the JS variable which contains the validator instance
 * @param closeTxt Tooltip of close link
 * @returns
 */
function onyxAddFieldValidator(markupId, jsVarName, closeTxt) {
  var val = jQuery('#' + markupId).validator({
    messageClass:onyxtextEntryValidatorMessageClass,
    position:'top left',
    speed:'slow',
    offset: [-2, 0],
    message: '<div><a href="javascript:void(0);" onclick="jQuery(\'#'+jsVarName+'\').data(\'validator\').reset();" title="'+closeTxt+'"></a><em/></div>' // em element is the arrow
  });
  return val;
}

function onyxHideAllValidatorMessages() {
	jQuery('.'+onyxtextEntryValidatorMessageClass).remove();
}

jQuery.fn.onyxScrollTo = function () {
    return this.each(function () {
    	jQuery('html, body').animate({
            scrollTop: jQuery(this).offset().top
        }, 1000);
    });
};

function onyxScrollTo(id) {
	jQuery('#' + id).onyxScrollTo();
}

function onyxClearPlaceholder(el,placeholderText) {
	if (el.value==placeholderText) {
		el.style.color='black';
		el.value='';
	}
//	el.onfocus='';
}
function onyxRestorePlaceholderIfEmpty(el,placeholderText) {
	if (el.value=='') {
		el.value=placeholderText;
		el.style.color='gray';
//		el.onfocus="onyxClearPlaceholder(this);";
		return true;
	}
	return false;
}

function onyxOnHottextSelection(iId, el, hId, isSC, tr, fa, min, max, minId, maxId) {
	if (isSC) { // first rest all elements
		jQuery('#' + iId + ' input').each(function(index, element) {
			if (jQuery(this).attr('type') == 'hidden') {
				jQuery(this).val(fa);
			}
		});
		jQuery('#' + iId + ' span.hottext').each(function(index, element) {
			jQuery(this).removeClass('selected');
		});
	}
	var h = document.getElementById(hId);
	var v = h.value;
	if (v == tr) {
	  h.value = fa;
	  el.className = 'hottext';
	} else {
	  h.value = tr;
	  el.className = 'hottext selected';
	}
	jQuery(h).trigger('change');

	var cnt = 0;
	jQuery('#' + iId + ' input').each(function(index, element) {
		if (jQuery(this).attr('type') == 'hidden') {
			if (jQuery(this).val() == tr) {
				++cnt;
			}
		}
	});
	if (min > 0) {
		if (min > cnt) {
			jQuery('#'+minId).show();
		} else {
			jQuery('#'+minId).hide();
		}
	}
	if (max > 0) {
		if (max < cnt) {
			jQuery('#'+maxId).show();
		} else {
			jQuery('#'+maxId).hide();
		}
	}

}

/**
 * Counts the strings in the value of the given HTML DOM element.
 * Does a simple whitespace count.
 * @param el
 * @returns
 */
function onyxExtTxtCountStrings(el) {
  if (el == null) return 0;
  var val = el.value; // current text
  if (val == null) return 0;
  if (val.length > 10 && val.length % 100 == 0) { // every 100 chars send to server
	  jQuery(el).trigger('intermediate');
  }

  // test if chinese - count characters
  var chinese = /[\u3400-\u9FBF]/.test(val);
  if (chinese) {
	  return val.replace(/ /g,'').length;
  }

  // latin text - count words
  val = val.replace(/[\s]+$/, ''); // remove trailing whitespaces
  if (val.length > 0) val = ' ' + val; // prepend a space (to enable counting the first word)
  var cnt = val.match(/[\s]+/g);
  if (cnt == null) return 0;
  return cnt.length;
}

/** Sets the innerHTML of the element defined by the given id */
function onyxSetInnerHtml(id,c) {
  var el = document.getElementById(id);
  if (el == null) return;
  el.innerHTML = c;
}

/**
 * Sets the CSS class of the elements defined by the given ids if given bool is false and removes it otherwise
 * arguments are expected in order:
 * boolean valid
 * string CSS class
 * string ids (varargs argument)
 * e.g.: onyxSetClassIfFalse(count < 2, 'errorClass', 'id1', 'id2', 'id3');
 */
var onyxSetClassIfFalse = function() {
  var argsArray = Array.prototype.slice.call(arguments); // convert varargs to array
  if (argsArray.length < 3) return;
  var valid = argsArray[0]; // 1st arg: is condition fullfilled
  var css = argsArray[1]; // 2nd arg: the CSS class to set, if condition was NOT fulfilled
  for (var i = 2; i < argsArray.length; ++i) {
    var el = document.getElementById(argsArray[i]); // nth arg: ids of the elements to set the CSS
    if (el == null) continue;
    if (!valid) {
    	jQuery(el).addClass(css);
    } else {
    	jQuery(el).removeClass(css);
    }
  }
};

/**
 * Shows the elements defined by the given ids if given bool is true and removes it otherwise
 * arguments are expected in order:
 * boolean show
 * string ids (varargs argument)
 * e.g.: showIfValid(count < 2, 'id1', 'id2', 'id3');
 */
var onyxShowElementIfTrue = function() {
  var argsArray = Array.prototype.slice.call(arguments); // convert varargs to array
  if (argsArray.length < 2) return;
  var show = argsArray[0]; // 1st arg: is condition fullfilled
  for (var i = 1; i < argsArray.length; ++i) {
    var el = document.getElementById(argsArray[i]); // nth arg: ids of the elements to set the CSS
    if (el == null) continue;
    if (show) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }
};

function onyxOrderAfterOrder(sId, oId, DEL) {
	// prepare JS function which sets the current order of the elements (client side, triggered by update event after each user action)
	var curordarr = jQuery('#' + sId).sortable('toArray'); // get current element order as array
	var curord = '';
	for (qwq = 0; qwq < curordarr.length; ++qwq) {
		curord = curord + curordarr[qwq] + DEL; // serialize it
	}
	var h = document.getElementById(oId);
	h.value = curord; // and store it to hidden field
	jQuery(h).trigger('change');
}

function onyxInitOrderInteraction(sId, oId, disable, DEL) {
	jQuery('#' + sId).sortable({  // make sortable
		containment: 'parent', // avoid dragging outside parent container
		tolerance: 'pointer', // pointer position determines when elements get sorted
		revert: true, // switch on animation
		cursor: 'move', // set cursor when dragging
		disabled: disable,
		// items: 'div', // just div's may be dragged, the spans also existing in parent only reserve space
		update: function(event, ui) {  // add update event method
			onyxOrderAfterOrder(sId, oId, DEL);
		} });
	jQuery('#' + sId + ' .sortable_item').each(function(index, element) {
		initTouch(jQuery(element));
	});
}

function touchHandler(event) {
	/* Thanks to http://blog.alaabadran.com/2012/01/23/drag-and-drop-with-jquery-for-touch-devices/ */
	let touches = event.changedTouches,
		first = touches[0],
		type = "";

	switch(event.type) {
		case "touchstart": type = "mousedown"; break;
        case "touchmove":  type="mousemove"; break;
        case "touchend":   type="mouseup"; break;
        default: return;
	}
	const simulatedEvent = document.createEvent("MouseEvent");
	simulatedEvent.initMouseEvent(type, true, true, window, 1,
		first.screenX, first.screenY,
		first.clientX, first.clientY, false,
		false, false, false, 0/*left*/, null);

	first.target.dispatchEvent(simulatedEvent);
	event.preventDefault();
}

var ieChecked = false;
function check4ie() {
	if (ieChecked == false) {
		jQuery.browser={};
		(function(){
			jQuery.browser.msie=false;
			jQuery.browser.version=0;
			if(navigator.userAgent.match(/MSIE ([0-9]+)\./)){
				jQuery.browser.msie=true;
				jQuery.browser.version=RegExp.$1;
			}
		})();
		ieChecked = true;
	}
}
/**
 * Adds a touch to mouse event converter to jQuery elements which should
 * support drag and drop actions on touchscreen devices.
 *
 * @param q jQuery element to handle
 */
function initTouch(q) {
	check4ie();
	let ver = 10;
	if (jQuery.browser.msie) {
		try {
			ver = parseInt(jQuery.browser.version);
		} catch (e) {}
	}
	if (ver > 9) {
		const el = q.get(0);
		el.addEventListener("touchstart", touchHandler, true);
		el.addEventListener("touchmove", touchHandler, true);
		el.addEventListener("touchend", touchHandler, true);
		el.addEventListener("touchcancel", touchHandler, true);
	}
}

/**
 * Show or hide navtree in mobile view
 * @returns {Boolean}
 */
function onyxShowHideTree(btn) {
	var nav = jQuery('nav');
	if (nav.is(':visible')) {
		nav.animate({width:'toggle'},100,'easeInOutCubic', function() {
			nav.addClass('ui-resizable');
			nav.css('display','');
		});
		jQuery(btn).removeClass('btn-highlight');
	} else {
		nav.css('display','none');
		nav.removeClass('ui-resizable');
		nav.animate({width:'toggle'},100,'easeInOutCubic');
		jQuery(btn).addClass('btn-highlight');
	}
	return false;
}

var NOT_SAFE_IN_XML_1_0 = /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm;
function onyxIsOkForXML(theString) {
    "use strict";
    var t1 = onyxSanitizeForXML(theString);
    var eq = t1 == theString;
    return eq;
}
function onyxSanitizeForXML(theString) {
    "use strict";
    var t1 = theString.replace(NOT_SAFE_IN_XML_1_0, '');
    return t1;
}
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function wrapInNoBreak(el, left, right) {
	let before = null;
	let after = null;

	if (left) {
		let txt = el.previousSibling;
		if (txt != null && txt !== "undefined" && txt.nodeType === 3) {
			let s = txt.nodeValue.trim();
			let i = s.lastIndexOf(" ");
			if (i > -1) {
				before = s.substring(i + 1);
				txt.nodeValue = s.substring(0, i + 1);
			} else if (s.length > 0) {
				before = s;
				txt.nodeValue = "";
			}
		}
	}
	if (right) {
		let txt = el.nextSibling;
		if (txt != null && txt !== "undefined" && txt.nodeType === 3) {
			let s = txt.nodeValue.trim();
			let i = s.indexOf(" ");
			if (i > -1) {
				after = s.substring(0, i + 1);
				txt.nodeValue = s.substring(i);
			} else if (s.length > 0) {
				after = s;
				txt.nodeValue = " ";
			}
		}
	}

	if (before != null || after != null) {
		let wrap = document.createElement("span");
		wrap.setAttribute("style","white-space:nowrap;");
		el.parentNode.insertBefore(wrap, el);
		if (before != null) {
			let tn = document.createTextNode(before);
			wrap.appendChild(tn);
		}
		wrap.appendChild(el);
		if (after != null) {
			let tn = document.createTextNode(after);
			wrap.appendChild(tn);
		}
	}
}

function removeWhiteSpaceNodes(e) {
	if (e.nodeType === 3 && e.nodeValue.trim().length === 0) { // remove text node, if it only contains whitespaces
		jQuery(e).remove();
	} else if (e.nodeType === 1) { // if content node check recursively
		jQuery(e).contents().each(function(i2,e2) {
			removeWhiteSpaceNodes(e2);
		});
	}
}

function cleanWhiteSpacesForCTest(inputId) {
	let el = jQuery("#" + inputId);
	let id = el.attr('id');
	let parent = el.parents('.interaction-container');

	const left = el.hasClass('ctest_l'); // remove whitespaces left of gap
	const right = el.hasClass('ctest_r'); // remove whitespaces right of gap
	let bLeft = true;
	let bRight = false;
	parent.contents().each(function(i1, e1) {
		if (right && bRight) {
			removeWhiteSpaceNodes(e1);
		}
		if (jQuery(e1).find('#' + id).length) {
			bLeft = false;
			bRight = true;
		}
		if (left && bLeft) {
			removeWhiteSpaceNodes(e1);
		}
	});
	wrapInNoBreak(parent.get(0), left, right);
}

function createChart(id, title, series, categories, bg, borders) {
	const myChart = new Chart(document.getElementById(id).getContext("2d"), {
		type: 'bar',
		data: {
			labels: categories,
			datasets: [{
				label: title,
				data: series,
				backgroundColor: bg,
				borderColor: borders,
				borderWidth: 1
			}]
		},
		options: {
			animation: {
				duration: 1500
			},
			legend: {
				display: false
			}
		}
	});
}