var BOSH_SERVICE = "http://localhost:7070/http-bind/";

var Peek = {
    connection : null,
    command_history: null,
    position: null,

    show_traffic: function (body, type) {
        if(body.childNodes.length > 0){
            var $console = $('#console').get(0);
            var at_bottom = $console.scrollTop >= $console.scrollHeight - $console.clientHeight;

            $.each(body.childNodes, function () {
                $('#console').append('<div class="'+type+'">'+Peek.pretty_xml(this)+'</div>');
            });

            if (at_bottom) {
                $console.scrollTop = $console.scrollHeight;
            }
        }
    },

    pretty_xml: function (xml, level) {
        var i, j;
        var result = [];
        if (!level) {
            level = 0;
        }

        result.push("<div class='xml_level" + level + "'>");
        result.push("<span class='xml_punc'>&lt;</span>");
        result.push("<span class='xml_tag'>");
        result.push(xml.tagName);
        result.push("</span>");

        // attributes
        var attrs = xml.attributes;
        var attr_lead = []
        for (i = 0; i < xml.tagName.length + 1; i++) {
            attr_lead.push("&nbsp;");
        }
        attr_lead = attr_lead.join("");

        for (i = 0; i < attrs.length; i++) {
            result.push(" <span class='xml_aname'>");
            result.push(attrs[i].nodeName);
            result.push("</span><span class='xml_punc'>='</span>");
            result.push("<span class='xml_avalue'>");
            result.push(attrs[i].nodeValue);
            result.push("</span><span class='xml_punc'>'</span>");

            if (i !== attrs.length - 1) {
                result.push("</div><div class='xml_level" + level + "'>");
                result.push(attr_lead);
            }
        }

        if (xml.childNodes.length === 0) {
            result.push("<span class='xml_punc'>/&gt;</span></div>");
        } else {
            result.push("<span class='xml_punc'>&gt;</span></div>");

            // children
            $.each(xml.childNodes, function () {
                if (this.nodeType === 1) {
                    result.push(Peek.pretty_xml(this, level + 1));
                } else if (this.nodeType === 3) {
                    result.push("<div class='xml_text xml_level" +
                                (level + 1) + "'>");
                    result.push(this.nodeValue);
                    result.push("</div>");
                }
            });

            result.push("<div class='xml xml_level" + level + "'>");
            result.push("<span class='xml_punc'>&lt;/</span>");
            result.push("<span class='xml_tag'>");
            result.push(xml.tagName);
            result.push("</span>");
            result.push("<span class='xml_punc'>&gt;</span></div>");
        }

        return result.join("");
    },

    text_to_xml: function (text){
        var doc = null;
        if(window['DOMParser']){
            var parser = new DOMParser();
            doc = parser.parseFromString(text, 'text/xml');
        }
        else if (window['ActiveXObject']){
            var doc = new ActiveXObject("MSXML2.DOMDocument");
            doc.async = false;
            doc.loadXML(text);
        }
        else{
            throw {
                type: "Peek Error",
                message: "No DOM Parser found"
            };
        }

        var elem = doc.documentElement;
        if($(elem).filter('parseerror').length > 0){
            return null;
        }
        return elem;
    }
};

$(document).ready(function (){
    $(document).trigger('connect', {
        jid: "test@sylruesoe",
        password: "test"
    });
});

$(document).on('connect', function (ev, data) {
    console.log("Attempting Connection");
    var conn = new Strophe.Connection(BOSH_SERVICE);

    // Logging the raw XML
    conn.xmlInput = function (body) {
        Peek.show_traffic(body, 'incoming');
    }

    conn.xmlOutput = function (body) {
        Peek.show_traffic(body, 'outgoing');
    }

    conn.connect(data.jid, data.password, function (status){
        // Check for connected Event
        if(status === Strophe.Status.CONNECTED){
            console.log("Connected");
            $(document).trigger('connected');
        }

        // Check for disconnect
        if(status === Strophe.Status.DISCONNECTED){
            console.log("Disconnected");
            $(document).trigger('disconnected');
        }
    });

    Peek.connection = conn;
    Peek.command_history = []
});

// On the connected event
$(document).on('connected', function (){
    Peek.connection.addHandler(function (e){
        console.log($(e).find('error')  );
    }, null, "iq", "error");

   $('.button').removeAttr('disabled');
   $('textarea').removeClass('disabled').removeAttr('disabled');
});

// On the disconnected event
$(document).on('disconnected', function (){

   $('.button').attr('disabled', 'disabled');
   $('textarea').addClass('disabled').attr('disabled', 'disabled');
});

$('#disconnect_button').on('click', function (){
    Peek.connection.disconnect();
});

$('textarea').on('keypress', function (e){
    // A key has been pressed
    if(e.keyCode == 13){
        e.preventDefault();
        console.log("Enter pressed");

        Peek.command_history.push($(this).val());
        Peek.position = Peek.command_history.length;

        var input = $('#input').val();
        var error =false;
        if(input.length > 0){
            if(input[0] === '<'){
                var xml = Peek.text_to_xml(input);
                if(xml){
                    Peek.connection.send(Strophe.copyElement(xml));
                    $('#input').val('');
                } else {
                    console.log("XMl Error");
                    error = true;
                }
            } else if(input[0] === '$'){
                try {
                    console.log("XML Start");
                    var builder = eval(input);
                    Peek.connection.send(builder);
                    $('#input').val('');
                } catch(e) {
                    error = true;
                    console.log("XML Exception: "+e.message);
                }
            } else {
                console.log("Mismatch Error");
                error = true;
            }
        } else {
            console.log("General Error");
            error = true;
        }

        if(error) {
            $('#input').animate({background: "#faa"});
        }
    }
});

$('textarea').on('keydown', function (e){
    if(Peek.command_history){
        if(e.keyCode === 38){
            e.preventDefault();

            if(Peek.position === 0){
                Peek.position = Peek.command_history.length;
            } else{
                Peek.position--;
            }

            $(this).val(Peek.command_history[Peek.position]);
        } else if(e.keyCode === 40){
            e.preventDefault();

            if(Peek.position === Peek.command_history.length){
                Peek.position = 0;
            } else{
                Peek.position ++;
            }

            $(this).val(Peek.command_history[Peek.position]);
        }
    }
});
