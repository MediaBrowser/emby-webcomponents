define([], function () {

    function loadImage(elem, url) {

        if (elem.tagName !== "IMG") {

            var tmp = new Image();

            tmp.onload = function () {
                elem.style.backgroundImage = "url('" + url + "')";
            };
            tmp.src = url;

        } else {
            elem.setAttribute("src", url);
        }

        //fadeIn(elem, 1);
    }

    return {
        loadImage: loadImage
    };

});