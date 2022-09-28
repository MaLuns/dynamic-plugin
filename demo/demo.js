var pjax = new Pjax({
    selectors: [
        "title",
        ".the-header",
        ".the-content",
        ".the-footer"
    ]
})
pjax._handleResponse = pjax.handleResponse;

pjax.handleResponse = function (responseText, request, href, options) {
    if (request.responseText.match("<html")) {
        DynamicPlugin.load(responseText)
        pjax._handleResponse(responseText, request, href, options);
    }
}