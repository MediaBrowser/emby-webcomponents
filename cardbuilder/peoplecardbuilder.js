define(['cardBuilder'], function (cardBuilder) {
    'use strict';

    function buildPeopleCards(items, options) {

        options = Object.assign(options || {}, {
            cardLayout: false,
            centerText: true,
            showTitle: true,
            cardFooterAside: false,
            showPersonRoleOrType: true,
            cardClass: 'personCard',
            defaultCardImageIcon: '&#xE7FD;',
            multiSelect: false
        });
        cardBuilder.buildCards(items, options);
    }

    return {
        buildPeopleCards: buildPeopleCards
    };

});