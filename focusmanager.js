define(['dom'], function (dom) {
    'use strict';

    var scopes = [];
    function pushScope(elem) {
        scopes.push(elem);
    }

    function popScope(elem) {

        if (scopes.length) {
            scopes.length -= 1;
        }
    }

    function autoFocus(view, defaultToFirst, findAutoFocusElement) {

        var element;
        if (findAutoFocusElement !== false) {
            element = view.querySelector('*[autofocus]');
            if (element) {
                focus(element);
                return element;
            }
        }

        if (defaultToFirst !== false) {
            element = getFocusableElements(view, 1)[0];

            if (element) {
                focus(element);
                return element;
            }
        }

        return null;
    }

    function focus(element) {

        try {
            element.focus();
        } catch (err) {
            console.log('Error in focusManager.autoFocus: ' + err);
        }
    }

    var focusableTagNames = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];
    var focusableContainerTagNames = ['BODY', 'DIALOG'];
    var focusableQuery = focusableTagNames.map(function (t) {

        if (t === 'INPUT') {
            t += ':not([type="range"])';
        }
        return t + ':not([tabindex="-1"]):not(:disabled)';

    }).join(',') + ',.focusable';

    function isFocusable(elem) {

        if (focusableTagNames.indexOf(elem.tagName) !== -1) {
            return true;
        }

        if (elem.classList && elem.classList.contains('focusable')) {
            return true;
        }

        return false;
    }

    function focusableParent(elem) {

        while (!isFocusable(elem)) {
            elem = elem.parentNode;

            if (!elem) {
                return null;
            }
        }

        return elem;
    }

    // Determines if a focusable element can be focused at a given point in time 
    function isCurrentlyFocusableInternal(elem) {

        // http://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
        if (elem.offsetParent === null) {
            return false;
        }

        return true;
    }

    // Determines if a focusable element can be focused at a given point in time 
    function isCurrentlyFocusable(elem) {

        if (elem.disabled) {
            return false;
        }

        if (elem.getAttribute('tabindex') === "-1") {
            return false;
        }

        if (elem.tagName === 'INPUT') {
            var type = elem.type;
            if (type === 'range') {
                return false;
            }
        }

        return isCurrentlyFocusableInternal(elem);
    }

    function getDefaultScope() {
        return scopes[0] || document.body;
    }

    function getFocusableElements(parent, limit) {
        var elems = (parent || getDefaultScope()).querySelectorAll(focusableQuery);
        var focusableElements = [];

        for (var i = 0, length = elems.length; i < length; i++) {

            var elem = elems[i];

            if (isCurrentlyFocusableInternal(elem)) {
                focusableElements.push(elem);

                if (limit && focusableElements.length >= limit) {
                    break;
                }
            }
        }

        return focusableElements;
    }

    function isFocusContainer(elem, direction) {

        if (focusableContainerTagNames.indexOf(elem.tagName) !== -1) {
            return true;
        }

        var classList = elem.classList;

        if (classList.contains('focuscontainer')) {
            return true;
        }

        if (direction === 0) {
            if (classList.contains('focuscontainer-x')) {
                return true;
            }
        }
        else if (direction === 1) {
            if (classList.contains('focuscontainer-x')) {
                return true;
            }
            if (classList.contains('focuscontainer-right')) {
                return true;
            }
        }
        else if (direction === 3) {
            if (classList.contains('focuscontainer-down')) {
                return true;
            }
        }

        return false;
    }

    function getFocusContainer(elem, direction) {
        while (!isFocusContainer(elem, direction)) {
            elem = elem.parentNode;

            if (!elem) {
                return getDefaultScope();
            }
        }

        return elem;
    }

    function getOffset(elem) {

        var box;

        // Support: BlackBerry 5, iOS 3 (original iPhone)
        // If we don't have gBCR, just use 0,0 rather than error
        if (elem.getBoundingClientRect) {
            box = elem.getBoundingClientRect();
        } else {
            box = {
                top: 0,
                left: 0,
                width: 0,
                height: 0
            };
        }

        if (box.right === null) {
            box.right = box.left + box.width;
            box.bottom = box.top + box.height;
        }

        return box;
    }

    var lastHorizontalDirection = 0;
    var lastVerticalDirection = 2;
    function nav(activeElement, direction) {

        console.log('nav--------------------------------------------------------');
        activeElement = activeElement || document.activeElement;

        if (activeElement) {
            activeElement = focusableParent(activeElement);
        }

        var container = activeElement ? getFocusContainer(activeElement, direction) : getDefaultScope();

        if (!activeElement) {
            autoFocus(container, true, false);
            return;
        }

        var focusableContainer = dom.parentWithClass(activeElement, 'focusable');

        var rect = getOffset(activeElement);
        var focusableElements = [];

        var focusable = container.querySelectorAll(focusableQuery);

        var fromBox = boxInDirection(rect, direction);

        var maxDistance = Infinity;
        var minDistance = maxDistance;

        var target;

        var focusPointBox = {
            x: (rect.right - rect.left) / 2,
            y: (rect.bottom - rect.top) / 2
        };

        lastHorizontalDirection = 0;
        lastVerticalDirection = 2;

        if (lastHorizontalDirection === 0) {
            focusPointBox.x = 0;
        }
        else if (lastHorizontalDirection === 1) {
            focusPointBox.x = rect.right - rect.left;
        }
        if (lastVerticalDirection === 2) {
            focusPointBox.y = 0;
        }
        else if (lastVerticalDirection === 3) {
            focusPointBox.y = rect.bottom - rect.top;
        }

        var fromFocusPoint = directions[direction].toUnified(boxCoordsToClient(focusPointBox, rect));

        for (var i = 0, length = focusable.length; i < length; i++) {
            var curr = focusable[i];

            if (curr === activeElement) {
                continue;
            }

            // Don't refocus into the same container
            if (curr === focusableContainer) {
                continue;
            }

            //if (!isCurrentlyFocusableInternal(curr)) {
            //    continue;
            //}

            var elementRect = getOffset(curr);

            // not currently visible
            if (!elementRect.width && !elementRect.height) {
                continue;
            }

            switch (direction) {

                case 0:
                    // left
                    if (elementRect.left >= rect.left) {
                        continue;
                    }
                    if (elementRect.right === rect.right) {
                        continue;
                    }
                    break;
                case 1:
                    // right
                    if (elementRect.right <= rect.right) {
                        continue;
                    }
                    if (elementRect.left === rect.left) {
                        continue;
                    }
                    break;
                case 2:
                    // up
                    if (elementRect.top >= rect.top) {
                        continue;
                    }
                    if (elementRect.bottom >= rect.bottom) {
                        continue;
                    }
                    break;
                case 3:
                    // down
                    if (elementRect.bottom <= rect.bottom) {
                        continue;
                    }
                    if (elementRect.top <= rect.top) {
                        continue;
                    }
                    break;
                default:
                    break;
            }

            var toBox = boxInDirection(elementRect, direction);

            // Skip elements that are not in the direction of movement
            if (toBox.fwd1 < fromBox.fwd2) {
                continue;
            }

            var dist = distance(fromBox, fromFocusPoint, toBox, direction);

            if (dist < minDistance) {
                target = curr;
                minDistance = dist;
            }
        }

        var nearestElement = target;

        if (nearestElement) {

            // See if there's a focusable container, and if so, send the focus command to that
            if (activeElement) {
                var nearestElementFocusableParent = dom.parentWithClass(nearestElement, 'focusable');
                if (nearestElementFocusableParent && nearestElementFocusableParent !== nearestElement) {
                    if (focusableContainer !== nearestElementFocusableParent) {
                        nearestElement = nearestElementFocusableParent;
                    }
                }
            }

            if (direction < 2) {
                lastHorizontalDirection = direction;
            } else {
                lastVerticalDirection = direction;
            }

            focus(nearestElement);
        }
    }

    var directions = {
        // left
        0: {
            toUnified: function (coords) {
                return { fwd: -coords.x, ort: -coords.y };
            },
            fromUnified: function (coords) {
                return { x: -coords.fwd, y: -coords.ort };
            }
        },
        // right
        1: {
            toUnified: function (coords) {
                return { fwd: coords.x, ort: coords.y };
            },
            fromUnified: function (coords) {
                return { x: coords.fwd, y: coords.ort };
            }
        },
        // up
        2: {
            toUnified: function (coords) {
                return { fwd: -coords.y, ort: coords.x };
            },
            fromUnified: function (coords) {
                return { x: coords.ort, y: -coords.fwd };
            }
        },
        // down
        3: {
            toUnified: function (coords) {
                return { fwd: coords.y, ort: -coords.x };
            },
            fromUnified: function (coords) {
                return { x: -coords.ort, y: coords.fwd };
            }
        }
    };

    function boxInDirection(box, direction) {
        var p1 = directions[direction].toUnified({ x: box.left, y: box.top });
        var p2 = directions[direction].toUnified({ x: box.right, y: box.bottom });
        return {
            fwd1: Math.min(p1.fwd, p2.fwd),
            ort1: Math.min(p1.ort, p2.ort),
            fwd2: Math.max(p1.fwd, p2.fwd),
            ort2: Math.max(p1.ort, p2.ort)
        };
    }

    function boxOverlap(box1, box2) {
        var orts = {
            ort1: box1.ort1,
            ort2: box1.ort2
        };

        if (box2.ort1 > orts.ort1) {
            orts.ort1 = box2.ort1;
        }
        if (box2.ort2 < orts.ort2) {
            orts.ort2 = box2.ort2;
        }

        var result = orts.ort2 - orts.ort1;
        if (result < 0) {
            result = 0;
        }

        return result;
    }

    function boxCoordsToClient(coords, box) {
        return {
            x: coords.x + box.left,
            y: coords.y + box.top
        };
    }

    function bound(val, min, max) {
        return Math.min(Math.max(val, min), max);
    }

    function distance(fromBox, fromFocusPoint, toBox, direction) {

        var fromPointFwd = fromFocusPoint.fwd;
        var fromPointOrt = fromFocusPoint.ort;

        var toPoint = {
            fwd: toBox.fwd1,
            ort: bound(fromPointOrt, toBox.ort1, toBox.ort2)
        };

        var fwdDist = Math.abs(toPoint.fwd - fromPointFwd);
        var ortDist = Math.abs(toPoint.ort - fromPointOrt);

        // The Euclidian distance between the current focus point position and
        // its potential position in the candidate.
        // If the two positions have the same coordinate on the axis orthogonal
        // to the navigation direction, dotDist is forced to 0 in order to favor
        // elements in direction of navigation
        var dotDist;
        if (toPoint.ort === fromPointOrt) {
            dotDist = 0;
        } else {
            dotDist = Math.sqrt(fwdDist * fwdDist + ortDist * ortDist);
        }

        // The overlap between the opposing edges of currently focused element and the candidate.
        // Elements are rewarded for having high overlap with the currently focused element.
        var overlap = boxOverlap(fromBox, toBox);

        return dotDist + fwdDist + 2 * ortDist - Math.sqrt(overlap);
    }

    function sendText(text) {
        var elem = document.activeElement;

        elem.value = text;
    }

    return {
        autoFocus: autoFocus,
        focus: focus,
        focusableParent: focusableParent,
        getFocusableElements: getFocusableElements,
        moveLeft: function (sourceElement) {
            nav(sourceElement, 0);
        },
        moveRight: function (sourceElement) {
            nav(sourceElement, 1);
        },
        moveUp: function (sourceElement) {
            nav(sourceElement, 2);
        },
        moveDown: function (sourceElement) {
            nav(sourceElement, 3);
        },
        sendText: sendText,
        isCurrentlyFocusable: isCurrentlyFocusable,
        pushScope: pushScope,
        popScope: popScope
    };
});