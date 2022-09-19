function initSocket(e) {
  var t = {
    _this: e,
    ws: null,
    urls: wsURL.split("|"),
    activeURL: -1,
    connected: !1,
    connectTM: null,
    reconnectFn: null,
    pingTM: null,
    ready: !1,
    calls: {},
    counter: 0,
    connectPromise: null,
    connect: function () {
      return (
        this.connectPromise || (this.connectPromise = promise(this._this)),
        this.connected
          ? (this.connectPromise.resolve(), (this.connectPromise = null))
          : ((this.counter = 0),
            (this.activeURL =
              this.activeURL + 1 == this.urls.length ? 0 : this.activeURL + 1),
            (this.ws = new WebSocket(
              this.urls[this.activeURL] +
                "?deviceId=" +
                deviceId +
                "&appVersion=" +
                appVersion +
                "&trackingSession=" +
                tSID
            )),
            (this.connectTM = setTimeout(t.reconnect, 5e3)),
            this.ws.addEventListener("open", function () {
              (this.connected = !0),
                t.connectTM && clearTimeout(t.connectTM),
                t.pingTM && clearInterval(this.pingTM),
                (t.pingTM = setInterval(t.sendPing, 25e3)),
                t.connectPromise.resolve(),
                (t.connectPromise = null);
            }),
            this.ws.addEventListener("message", t.message),
            this.ws.addEventListener("error", t.error),
            this.ws.addEventListener("close", t.reconnect)),
        this.connectPromise
      );
    },
    disconnect: function () {
      this.connectTM && clearTimeout(this.connectTM),
        this.pingTM && clearInterval(this.pingTM),
        (this.connected = !1),
        this.ws.removeEventListener("message", t.message),
        this.ws.removeEventListener("error", t.error),
        this.ws.removeEventListener("close", t.reconnect);
      try {
        this.ws.close();
      } catch (e) {}
    },
    setReconnectFn: function (e) {
      t.reconnectFn = e;
    },
    error: function () {
      t.reconnect();
    },
    reconnect: function () {
      t.disconnect(),
        t.reconnectFn
          ? setTimeout(function () {
              t.connect().then(t.reconnectFn);
            }, 1500)
          : setTimeout(t.connect, 1500);
    },
    sendPing: function () {
      t.send("ping");
    },
    send: function (e, t) {
      var n = promise(this._this);
      return (
        1 === this.ws.readyState
          ? ((t = t || {}),
            this.counter++,
            (this.calls[this.counter] = [n, t, e]),
            this.ws.send(
              JSON.stringify({
                destination: e,
                correlationId: this.counter,
                randomRequestUuid: generateNewUUID(),
                payload: t,
              })
            ),
            appVersion.indexOf(".website.test") > 0 &&
              console.log(
                ("<< %c" + e + "[" + this.counter + "]").padEnd(40),
                "font-weight:bold; color:#133d8b;",
                t
              ))
          : n.reject("CONNECTION_ERROR"),
        n
      );
    },
    eventsMap: {
      "user.termsAndConditions.confirmedEvent": "tcConfirmed",
      "user.statusChangedEvent": "statusChanged",
      "user.registrationForm.submittedEvent": "formSubmitted",
      "user.email.confirmedEvent": "emailConfirmed",
      "account.balanceChangedEvent": "balanceChange",
      "trading.riskCheck.marginEvent": "marginChange",
      "user.registrationFlowTypeChangedEvent": "updateRegFlow",
      "user.registrationForm.updatedEvent": "updateRegForm",
      "user.personalDetails.updatedEvent": "updatePersonalDetails",
      "user.termsAndConditions.versionCheckEvent": "termsCheck",
      "user.professional.profile.status.changed": "proStatusChanged",
      "user.jurisdictions.addedEvent": "jurisdictionAdded",
      "user.jurisdiction.changedEvent": "jurisdictionChanged",
      "user.verification.regMail.rejected": "poaRejected",
      "user.verification.regMail.requested": "poaRequested",
      "user.verification.regMail.submitted": "poaSubmitted",
      "user.documentUploadedEvent": "docUploaded",
      "user.documentRejectedEvent": "docRejected",
      "user.documentRejectedEvent.v2": "docRejectedv2",
      "user.documentApprovedEvent": "docApproved",
      "account.createdEvent": "finAccountCreated",
    },
    message: function (n) {
      try {
        n.data instanceof Blob ? unLZ4(t, n.data) : (n = JSON.parse(n.data)),
          t.calls[n.correlationId]
            ? (n.payload.errorCode
                ? (t.calls[n.correlationId][0].reject(
                    n.payload.errorCode,
                    t.calls[n.correlationId][1],
                    n.payload
                  ),
                  ("INVALID_SESSION" != n.payload.errorCode &&
                    "UNDER_MAINTENANCE" != n.payload.errorCode &&
                    "UNAUTHORIZED" != n.payload.errorCode) ||
                    e.unauthorize(n.payload.errorCode))
                : t.calls[n.correlationId][0].resolve(
                    n.payload,
                    t.calls[n.correlationId][1]
                  ),
              appVersion.indexOf(".website.test") > 0 &&
                n.payload &&
                console.log(
                  (
                    ">> %c" +
                    t.calls[n.correlationId][2] +
                    "[" +
                    n.correlationId +
                    "]"
                  ).padEnd(40),
                  "font-weight:bold; color:#1d4717;",
                  n.payload
                ))
            : (e[t.eventsMap[n.destination]] &&
                e[t.eventsMap[n.destination]](n.payload),
              e[t.eventsMap[n.destination] + "Local"] &&
                e[t.eventsMap[n.destination] + "Local"](n.payload),
              appVersion.indexOf(".website.test") > 0 &&
                n.payload &&
                console.log(
                  (">> %c" + n.destination).padEnd(40),
                  "font-weight:bold; color:#471e14;",
                  n.payload
                ));
      } catch (e) {
        console.log(e);
      }
    },
  };
  return t;
}
var LZ4Loaded, Buffer, LZ4;
function loadListener(e) {
  return function (t) {
    var n = t.target.result,
      o = new DataView(n, 0, 4).getInt32(0),
      r = new Buffer(n.slice(4)),
      i = new Buffer(o),
      s = LZ4.decodeBlock(r, i);
    e.message({ data: "" + i.slice(0, s) });
  };
}
function unLZ4(e, t) {
  if (LZ4Loaded) {
    var n = new FileReader();
    n.addEventListener("load", loadListener(e)), n.readAsArrayBuffer(t);
  } else
    $.ajax({
      cache: !0,
      url: "/js/vendor/lz4.min.js",
      dataType: "script",
      success: function () {
        (Buffer = window.require("buffer").Buffer),
          (LZ4 = window.require("lz4")),
          (LZ4Loaded = !0),
          unLZ4(e, t);
      },
    });
}
function APICall(e, t, n, o, r) {
  var i = promise(),
    s = {
      "Device-Id": deviceId,
      "App-Version": appVersion,
      "Tracking-Session-Id": tSID,
    };
  return (
    n && (s["Session-Token"] = n),
    window.XMLHttpRequest &&
      window.cpXHRo &&
      ((window.XMLHttpRequest.prototype.open = cpXHRo),
      (window.XMLHttpRequest.prototype.send = cpXHRs)),
    $.ajax({
      url: pURL + "/v1/api/" + e,
      type: "POST",
      headers: s,
      data: JSON.stringify(t || {}),
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      xhrFields: { withCredentials: !!o },
      crossDomain: !!o,
      success: function (e) {
        i.resolve(e);
      },
      error: function (n, o) {
        var a = "HZ";
        if (n) {
          if (n.responseJSON && n.responseJSON.errorCode)
            a = n.responseJSON.errorCode;
          else
            try {
              a = JSON.parse(n.responseText).errorCode;
            } catch (e) {}
          n.status && (o += " " + n.status);
        } else n = {};
        if (("BAD_REQUEST" == a && (a = "HZ"), r || (a && "HZ" != a)))
          i.reject(a, o);
        else {
          var c =
            "proxy|" +
            e +
            "|" +
            n.readyState +
            "|" +
            n.status +
            "|" +
            n.statusText +
            "|" +
            deviceId +
            "|" +
            (+n.status > 299 ? "" : n.responseText);
          $.post("/service", {
            mode: "jslog",
            type: "apierror",
            msg: c,
            url: document.location.href,
          }),
            $.ajax({
              url: "/proxy/v1/api/" + e,
              type: "POST",
              headers: s,
              data: JSON.stringify(t || {}),
              dataType: "json",
              contentType: "application/json; charset=utf-8",
              success: function (e) {
                i.resolve(e),
                  $.post("/service", {
                    mode: "jslog",
                    type: "apierror",
                    msg: "siteok-" + c,
                    url: document.location.href,
                  });
              },
              error: function (t, n) {
                var o = "HZ";
                if (t) {
                  if (t.responseJSON && t.responseJSON.errorCode)
                    o = t.responseJSON.errorCode;
                  else
                    try {
                      o = JSON.parse(t.responseText).errorCode;
                    } catch (e) {}
                  t.status && (n += " " + t.status);
                } else t = {};
                if (("BAD_REQUEST" == o && (o = "HZ"), o && "HZ" != o))
                  i.reject(o, n),
                    $.post("/service", {
                      mode: "jslog",
                      type: "apierror",
                      msg: "siteok-" + e + "|" + o + "|" + n,
                      url: document.location.href,
                    });
                else {
                  var r =
                    "site|" +
                    e +
                    "|" +
                    t.readyState +
                    "|" +
                    t.status +
                    "|" +
                    t.statusText +
                    "|" +
                    deviceId +
                    "|" +
                    (+t.status > 299 ? "" : t.responseText);
                  $.post("/service", {
                    mode: "jslog",
                    type: "apierror",
                    msg: r,
                    url: document.location.href,
                  })
                    .done(function (e) {
                      i.reject(o, n + " " + e);
                    })
                    .fail(function () {
                      i.reject(o, n);
                    });
                }
              },
            });
        }
      },
    }),
    i
  );
}
function APIPaymentCall(e, t, n) {
  var o = promise();
  return (
    $.ajax({
      url: ppURL + "/gateway/v1/" + e + (n ? "" : "/?" + jQuery.param(t)),
      type: n ? "POST" : "GET",
      headers: {
        "Device-Id": deviceId,
        "App-Version": appVersion,
        "Session-Token": getSID(),
        "Tracking-Session-Id": tSID,
      },
      contentType: "application/json; charset=utf-8",
      data: n ? JSON.stringify(t || {}) : null,
      success: function (e) {
        o.resolve(e);
      },
      error: function (t, n) {
        var r = "HZ";
        if (t) {
          if (t.responseJSON && t.responseJSON.errorCode)
            r = t.responseJSON.errorCode;
          else
            try {
              r = JSON.parse(t.responseText).errorCode;
            } catch (e) {}
          t.status && (n += " " + t.status);
        } else t = {};
        if (("BAD_REQUEST" == r && (r = "HZ"), r && "HZ" != r)) o.reject(r, n);
        else {
          var i =
            "payment=" +
            e +
            "|" +
            t.readyState +
            "|" +
            t.status +
            "|" +
            t.statusText +
            "|" +
            deviceId +
            "|" +
            t.responseText;
          $.post("/service", {
            mode: "jslog",
            type: "apierror",
            msg: i,
            url: document.location.href,
          })
            .done(function (e) {
              o.reject(r, n + " " + e);
            })
            .fail(function () {
              o.reject(r, n);
            });
        }
      },
    }),
    o
  );
}
function setCookieSessionId(e, t) {
  cookieSet("__cp_sid", e), cookieSet("__cp_uid", t, null, !0);
}
function promise(e) {
  return (
    e || (e = this),
    {
      resolve: function () {
        this.resolveArgs = arguments;
      },
      reject: function () {
        this.rejectArgs = arguments;
      },
      then: function (t) {
        return (
          this.resolveArgs
            ? t.apply(e, this.resolveArgs)
            : (this.resolve = function () {
                t.apply(e, arguments);
              }),
          this
        );
      },
      catch: function (t) {
        return (
          this.rejectArgs
            ? t.apply(e, this.rejectArgs)
            : (this.reject = function () {
                t.apply(e, arguments);
              }),
          this
        );
      },
    }
  );
}
function fieldControl(e, t, n) {
  var o = $("#" + e),
    r = $("input", o),
    i = $(".js-clear-control", o),
    s = $(".js-eye-control", o),
    a = {
      value: "",
      fld: r,
      wrapper: o,
      displayErrors: !1,
      focused: !1,
      valid: !0,
      errors: {},
      validators: t,
      change: n,
      setVal: function (e) {
        return this.fld.val(e), (this.value = e), this.onChange(null, !0), a;
      },
      onFocus: function () {
        this.wrapper.parent().addClass("active"), (this.focused = !0);
      },
      onBlur: function () {
        (this.focused = !1),
          this.valid ||
            this.errors.required ||
            (this.displayErrors ||
              (this.wrapper.addClass("error"),
              o.siblings(".password-list").show(),
              setTimeout(function () {
                o.siblings(".password-list").hide();
              }, 3200)),
            (this.displayErrors = !0)),
          this.value ||
            (this.wrapper.parent().removeClass("active"),
            i && i.hide(),
            s && s.hide());
      },
      onChange: function (e, t) {
        this.displayErrors &&
          (this.wrapper.removeClass("error"), (this.displayErrors = !1)),
          (this.valid = !0),
          (this.errors = {}),
          (this.value = this.fld.val());
        var n = this;
        return (
          this.validators.forEach(function (e) {
            var t = e(n.value);
            t && ((n.valid = !1), (n.errors[t] = !0));
          }),
          this.value || this.focused
            ? this.value &&
              (this.wrapper.parent().addClass("active"),
              i && i.show(),
              s && s.show())
            : this.wrapper.parent().removeClass("active"),
          !t && this.change(e),
          a
        );
      },
      destroy: function () {
        r.off("focus blur change keyup");
      },
      clear: function () {
        i && i.hide(),
          s && s.hide(),
          this.fld.val("").keyup(),
          this.wrapper.parent().removeClass("active");
      },
    };
  return (
    r.on("blur", function (e) {
      a.onBlur(e);
    }),
    r.on("focus", function (e) {
      a.onFocus(e);
    }),
    r.on("change keyup", function (e) {
      a.onChange(e);
    }),
    i &&
      i.on("click", function (e) {
        a.clear();
      }),
    a.onChange({}, !0),
    a
  );
}
function fieldControlPassword(e, t, n) {
  var o = fieldControl(e, t, n);
  return (
    o.wrapper
      .find(".js-eye-control")
      .off("click")
      .on("click", function (e) {
        var t = $(this),
          n = "password" === o.fld.attr("type") ? "text" : "password";
        t.toggleClass("sprite4-pass-hide sprite4-pass-show"),
          o.fld.attr("type", n);
      }),
    o
  );
}
function isPassLetter(e) {
  return ("" + e).search(/[a-zA-Z]/) > -1 ? null : "passletter";
}
function isPassDigit(e) {
  return ("" + e).search(/\d/) > -1 ? null : "passdigit";
}
function isNumber(e) {
  return /^(\d+|\d+\.\d+)$/.test(e) ? null : "invalidNumber";
}
function isPassLength(e) {
  return (e = "" + e).length >= 8 && e.length <= 100 ? null : "passlength";
}
function isPassLowLetter(e) {
  return ("" + e).search(/[a-z]/) > -1 ? null : "passlowletter";
}
function isPassUpLetter(e) {
  return ("" + e).search(/[A-Z]/) > -1 ? null : "passupletter";
}
function isPassSpecial(e) {
  return ("" + e).search(/[!@#\$%\^\&*\)\(\-+=._|[\]}{'\/\/?]/) > -1
    ? null
    : "passspecial";
}
function validateCustom(e) {
  return function (t) {
    return e(t) ? null : "custom";
  };
}
function nameValidatorEV(e) {
  return new RegExp(
    /^\s*([A-Za-z'\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff\-\s]){1,140}\s*$/,
    "i"
  ).test(e)
    ? null
    : "errsymbol";
}
function nameValidator(e) {
  return new RegExp(
    /^\s*([A-Za-zА-Яа-яΑ-Ωα-ωÄÀÁÂÃÅǍĄĂÆÇĆĈČĎĐÐÈÉÊËĚĘĜĢĞĤÌÍÎÏĴĶĹĻŁĽÑŃŇÖÒÓÔÕŐØŒŔŘẞŚŜŞŠȘŤŢÞȚÜÙÚÛŰŨŲŮŴÝŸŶŹŽŻäàáâãåǎąăæçćĉčďđðèéêëěęĝģğĥìíîïĵķĺļłľñńňöòóôõőøœŕřßśŝşšșťţþțüùúûűũųůŵýÿŷźžż'\-\s]){1,140}\s*$/,
    "i"
  ).test(e)
    ? null
    : "errsymbol";
}
function validateCustomType(e) {
  return function (t) {
    return e(t);
  };
}
function isRequired(e) {
  return e ? null : "required";
}
function isValidEmail(e) {
  "use strict";
  return /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/.test(
    e
  ) && /^\S+\@\S+\.\S+$/.test(e)
    ? null
    : "email";
}
function backToLastSitePage() {
  try {
    var e = ("" + document.cookie).match(
      new RegExp("__cp_lastPage=(.+?)(;|$)")
    );
    if (e)
      return (
        (document.cookie =
          "__cp_lastPage=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"),
        void (document.location.href = e[1])
      );
  } catch (e) {}
  document.location.href = "/" + lnProp;
}
function formatNumber(e) {
  var t =
    0 === (e = (+e).toFixed(2).replace(",", ".")).indexOf("-")
      ? ((e = e.slice(1)), "-")
      : "";
  return (
    e.length > 12 && (e = e.slice(0, -12) + "," + e.slice(-12)),
    e.length > 9 && (e = e.slice(0, -9) + "," + e.slice(-9)),
    e.length > 6 && (e = e.slice(0, -6) + "," + e.slice(-6)),
    t + e
  );
}
$(".js-dropdown-control").each(function () {
  var e = $(this).closest(".js-dropdown-wrapper");
  $(this).on("click", function () {
    $(e).addClass("active");
  }),
    $(this).on("blur", function () {
      $(e).removeClass("active");
    });
});
var sha256 = function e(t) {
  function n(e, t) {
    return (e >>> t) | (e << (32 - t));
  }
  for (
    var o,
      r,
      i = Math.pow,
      s = i(2, 32),
      a = "length",
      c = "",
      u = [],
      l = 8 * t[a],
      d = (e.h = e.h || []),
      p = (e.k = e.k || []),
      f = p[a],
      h = {},
      g = 2;
    64 > f;
    g++
  )
    if (!h[g]) {
      for (o = 0; 313 > o; o += g) h[o] = g;
      (d[f] = (i(g, 0.5) * s) | 0), (p[f++] = (i(g, 1 / 3) * s) | 0);
    }
  for (t += ""; (t[a] % 64) - 56; ) t += "\0";
  for (o = 0; o < t[a]; o++) {
    if ((r = t.charCodeAt(o)) >> 8) return;
    u[o >> 2] |= r << (((3 - o) % 4) * 8);
  }
  for (u[u[a]] = (l / s) | 0, u[u[a]] = l, r = 0; r < u[a]; ) {
    var v = u.slice(r, (r += 16)),
      m = d;
    for (d = d.slice(0, 8), o = 0; 64 > o; o++) {
      var x = v[o - 15],
        w = v[o - 2],
        y = d[0],
        T = d[4],
        C =
          d[7] +
          (n(T, 6) ^ n(T, 11) ^ n(T, 25)) +
          ((T & d[5]) ^ (~T & d[6])) +
          p[o] +
          (v[o] =
            16 > o
              ? v[o]
              : (v[o - 16] +
                  (n(x, 7) ^ n(x, 18) ^ (x >>> 3)) +
                  v[o - 7] +
                  (n(w, 17) ^ n(w, 19) ^ (w >>> 10))) |
                0);
      (d = [
        (C +
          ((n(y, 2) ^ n(y, 13) ^ n(y, 22)) +
            ((y & d[1]) ^ (y & d[2]) ^ (d[1] & d[2])))) |
          0,
      ].concat(d))[4] = (d[4] + C) | 0;
    }
    for (o = 0; 8 > o; o++) d[o] = (d[o] + m[o]) | 0;
  }
  for (o = 0; 8 > o; o++)
    for (r = 3; r + 1; r--) {
      var S = (d[o] >> (8 * r)) & 255;
      c += (16 > S ? 0 : "") + S.toString(16);
    }
  return c;
};
function utf8_encode(e) {
  if (null == e) return "";
  var t,
    n,
    o,
    r = e + "",
    i = "";
  (t = n = 0), (o = r.length);
  for (var s = 0; s < o; s++) {
    var a = r.charCodeAt(s),
      c = null;
    if (a < 128) n++;
    else if (a > 127 && a < 2048)
      c = String.fromCharCode((a >> 6) | 192, (63 & a) | 128);
    else if (55296 != (63488 & a))
      c = String.fromCharCode(
        (a >> 12) | 224,
        ((a >> 6) & 63) | 128,
        (63 & a) | 128
      );
    else {
      if (55296 != (64512 & a))
        throw new RangeError("Unmatched trail surrogate at " + s);
      var u = r.charCodeAt(++s);
      if (56320 != (64512 & u))
        throw new RangeError("Unmatched lead surrogate at " + (s - 1));
      (a = ((1023 & a) << 10) + (1023 & u) + 65536),
        (c = String.fromCharCode(
          (a >> 18) | 240,
          ((a >> 12) & 63) | 128,
          ((a >> 6) & 63) | 128,
          (63 & a) | 128
        ));
    }
    null !== c && (n > t && (i += r.slice(t, n)), (i += c), (t = n = s + 1));
  }
  return n > t && (i += r.slice(t, o)), i;
}
function md5(e) {
  e = e.toLowerCase();
  var t,
    n,
    o,
    r,
    i,
    s,
    a,
    c,
    u,
    l,
    d,
    p = function (e, t) {
      return (e << t) | (e >>> (32 - t));
    },
    f = function (e, t) {
      var n, o, r, i, s;
      return (
        (r = 2147483648 & e),
        (i = 2147483648 & t),
        (s = (1073741823 & e) + (1073741823 & t)),
        (n = 1073741824 & e) & (o = 1073741824 & t)
          ? 2147483648 ^ s ^ r ^ i
          : n | o
          ? 1073741824 & s
            ? 3221225472 ^ s ^ r ^ i
            : 1073741824 ^ s ^ r ^ i
          : s ^ r ^ i
      );
    },
    h = function (e, t, n, o, r, i, s) {
      return (
        (e = f(
          e,
          f(
            f(
              (function (e, t, n) {
                return (e & t) | (~e & o);
              })(t, n),
              r
            ),
            s
          )
        )),
        f(p(e, i), t)
      );
    },
    g = function (e, t, n, o, r, i, s) {
      return (
        (e = f(
          e,
          f(
            f(
              (function (e, t, n) {
                return (e & o) | (t & ~o);
              })(t, n),
              r
            ),
            s
          )
        )),
        f(p(e, i), t)
      );
    },
    v = function (e, t, n, o, r, i, s) {
      return (
        (e = f(
          e,
          f(
            f(
              (function (e, t, n) {
                return e ^ t ^ o;
              })(t, n),
              r
            ),
            s
          )
        )),
        f(p(e, i), t)
      );
    },
    m = function (e, t, n, o, r, i, s) {
      return (
        (e = f(
          e,
          f(
            f(
              (function (e, t, n) {
                return t ^ (e | ~o);
              })(t, n),
              r
            ),
            s
          )
        )),
        f(p(e, i), t)
      );
    },
    x = function (e) {
      var t,
        n = "",
        o = "";
      for (t = 0; t <= 3; t++)
        n += (o = "0" + ((e >>> (8 * t)) & 255).toString(16)).substr(
          o.length - 2,
          2
        );
      return n;
    };
  for (
    c = 1732584193,
      u = 4023233417,
      l = 2562383102,
      d = 271733878,
      t = (n = (function (e) {
        for (
          var t,
            n = e.length,
            o = n + 8,
            r = 16 * ((o - (o % 64)) / 64 + 1),
            i = new Array(r - 1),
            s = 0,
            a = 0;
          a < n;

        )
          (s = (a % 4) * 8),
            (i[(t = (a - (a % 4)) / 4)] = i[t] | (e.charCodeAt(a) << s)),
            a++;
        return (
          (s = (a % 4) * 8),
          (i[(t = (a - (a % 4)) / 4)] = i[t] | (128 << s)),
          (i[r - 2] = n << 3),
          (i[r - 1] = n >>> 29),
          i
        );
      })((e = utf8_encode(e)))).length,
      o = 0;
    o < t;
    o += 16
  )
    (r = c),
      (i = u),
      (s = l),
      (a = d),
      (c = h(c, u, l, d, n[o + 0], 7, 3614090360)),
      (d = h(d, c, u, l, n[o + 1], 12, 3905402710)),
      (l = h(l, d, c, u, n[o + 2], 17, 606105819)),
      (u = h(u, l, d, c, n[o + 3], 22, 3250441966)),
      (c = h(c, u, l, d, n[o + 4], 7, 4118548399)),
      (d = h(d, c, u, l, n[o + 5], 12, 1200080426)),
      (l = h(l, d, c, u, n[o + 6], 17, 2821735955)),
      (u = h(u, l, d, c, n[o + 7], 22, 4249261313)),
      (c = h(c, u, l, d, n[o + 8], 7, 1770035416)),
      (d = h(d, c, u, l, n[o + 9], 12, 2336552879)),
      (l = h(l, d, c, u, n[o + 10], 17, 4294925233)),
      (u = h(u, l, d, c, n[o + 11], 22, 2304563134)),
      (c = h(c, u, l, d, n[o + 12], 7, 1804603682)),
      (d = h(d, c, u, l, n[o + 13], 12, 4254626195)),
      (l = h(l, d, c, u, n[o + 14], 17, 2792965006)),
      (c = g(
        c,
        (u = h(u, l, d, c, n[o + 15], 22, 1236535329)),
        l,
        d,
        n[o + 1],
        5,
        4129170786
      )),
      (d = g(d, c, u, l, n[o + 6], 9, 3225465664)),
      (l = g(l, d, c, u, n[o + 11], 14, 643717713)),
      (u = g(u, l, d, c, n[o + 0], 20, 3921069994)),
      (c = g(c, u, l, d, n[o + 5], 5, 3593408605)),
      (d = g(d, c, u, l, n[o + 10], 9, 38016083)),
      (l = g(l, d, c, u, n[o + 15], 14, 3634488961)),
      (u = g(u, l, d, c, n[o + 4], 20, 3889429448)),
      (c = g(c, u, l, d, n[o + 9], 5, 568446438)),
      (d = g(d, c, u, l, n[o + 14], 9, 3275163606)),
      (l = g(l, d, c, u, n[o + 3], 14, 4107603335)),
      (u = g(u, l, d, c, n[o + 8], 20, 1163531501)),
      (c = g(c, u, l, d, n[o + 13], 5, 2850285829)),
      (d = g(d, c, u, l, n[o + 2], 9, 4243563512)),
      (l = g(l, d, c, u, n[o + 7], 14, 1735328473)),
      (c = v(
        c,
        (u = g(u, l, d, c, n[o + 12], 20, 2368359562)),
        l,
        d,
        n[o + 5],
        4,
        4294588738
      )),
      (d = v(d, c, u, l, n[o + 8], 11, 2272392833)),
      (l = v(l, d, c, u, n[o + 11], 16, 1839030562)),
      (u = v(u, l, d, c, n[o + 14], 23, 4259657740)),
      (c = v(c, u, l, d, n[o + 1], 4, 2763975236)),
      (d = v(d, c, u, l, n[o + 4], 11, 1272893353)),
      (l = v(l, d, c, u, n[o + 7], 16, 4139469664)),
      (u = v(u, l, d, c, n[o + 10], 23, 3200236656)),
      (c = v(c, u, l, d, n[o + 13], 4, 681279174)),
      (d = v(d, c, u, l, n[o + 0], 11, 3936430074)),
      (l = v(l, d, c, u, n[o + 3], 16, 3572445317)),
      (u = v(u, l, d, c, n[o + 6], 23, 76029189)),
      (c = v(c, u, l, d, n[o + 9], 4, 3654602809)),
      (d = v(d, c, u, l, n[o + 12], 11, 3873151461)),
      (l = v(l, d, c, u, n[o + 15], 16, 530742520)),
      (c = m(
        c,
        (u = v(u, l, d, c, n[o + 2], 23, 3299628645)),
        l,
        d,
        n[o + 0],
        6,
        4096336452
      )),
      (d = m(d, c, u, l, n[o + 7], 10, 1126891415)),
      (l = m(l, d, c, u, n[o + 14], 15, 2878612391)),
      (u = m(u, l, d, c, n[o + 5], 21, 4237533241)),
      (c = m(c, u, l, d, n[o + 12], 6, 1700485571)),
      (d = m(d, c, u, l, n[o + 3], 10, 2399980690)),
      (l = m(l, d, c, u, n[o + 10], 15, 4293915773)),
      (u = m(u, l, d, c, n[o + 1], 21, 2240044497)),
      (c = m(c, u, l, d, n[o + 8], 6, 1873313359)),
      (d = m(d, c, u, l, n[o + 15], 10, 4264355552)),
      (l = m(l, d, c, u, n[o + 6], 15, 2734768916)),
      (u = m(u, l, d, c, n[o + 13], 21, 1309151649)),
      (c = m(c, u, l, d, n[o + 4], 6, 4149444226)),
      (d = m(d, c, u, l, n[o + 11], 10, 3174756917)),
      (l = m(l, d, c, u, n[o + 2], 15, 718787259)),
      (u = m(u, l, d, c, n[o + 9], 21, 3951481745)),
      (c = f(c, r)),
      (u = f(u, i)),
      (l = f(l, s)),
      (d = f(d, a));
  return (x(c) + x(u) + x(l) + x(d)).toLowerCase();
}
function byteToHex(e) {
  return ("0" + Number(e).toString(16)).slice(-2).toLowerCase();
}
function stringifyUUID(e) {
  return (
    byteToHex(e[0]) +
    byteToHex(e[1]) +
    byteToHex(e[2]) +
    byteToHex(e[3]) +
    "-" +
    byteToHex(e[4]) +
    byteToHex(e[5]) +
    "-" +
    byteToHex(e[6]) +
    byteToHex(e[7]) +
    "-" +
    byteToHex(e[8]) +
    byteToHex(e[9]) +
    "-" +
    byteToHex(e[10]) +
    byteToHex(e[11]) +
    byteToHex(e[12]) +
    byteToHex(e[13]) +
    byteToHex(e[14]) +
    byteToHex(e[15])
  ).toLowerCase();
}
function f(e, t, n, o) {
  switch (e) {
    case 0:
      return (t & n) ^ (~t & o);
    case 1:
      return t ^ n ^ o;
    case 2:
      return (t & n) ^ (t & o) ^ (n & o);
    case 3:
      return t ^ n ^ o;
  }
}
function ROTL(e, t) {
  return (e << t) | (e >>> (32 - t));
}
function sha1forUUID(e) {
  var t = [1518500249, 1859775393, 2400959708, 3395469782],
    n = 1732584193,
    o = 4023233417,
    r = 2562383102,
    i = 271733878,
    s = [n, o, r, i, 3285377520];
  if ("string" == typeof e) {
    var a = unescape(encodeURIComponent(e));
    e = [];
    for (var c = 0; c < a.length; ++c) e.push(a.charCodeAt(c));
  } else Array.isArray(e) || (e = Array.prototype.slice.call(e));
  e.push(128);
  var u = e.length / 4 + 2,
    l = Math.ceil(u / 16),
    d = new Array(l);
  for (c = 0; c < l; ++c) {
    for (var p = new Uint32Array(16), h = 0; h < 16; ++h)
      p[h] =
        (e[64 * c + 4 * h] << 24) |
        (e[64 * c + 4 * h + 1] << 16) |
        (e[64 * c + 4 * h + 2] << 8) |
        e[64 * c + 4 * h + 3];
    d[c] = p;
  }
  (d[l - 1][14] = (8 * (e.length - 1)) / Math.pow(2, 32)),
    (d[l - 1][14] = Math.floor(d[l - 1][14])),
    (d[l - 1][15] = (8 * (e.length - 1)) & 4294967295);
  for (c = 0; c < l; ++c) {
    for (var g = new Uint32Array(80), v = 0; v < 16; ++v) g[v] = d[c][v];
    for (v = 16; v < 80; ++v)
      g[v] = ROTL(g[v - 3] ^ g[v - 8] ^ g[v - 14] ^ g[v - 16], 1);
    var m = s[0],
      x = s[1],
      w = s[2],
      y = s[3],
      T = s[4];
    for (v = 0; v < 80; ++v) {
      var C = Math.floor(v / 20),
        S = (ROTL(m, 5) + f(C, x, w, y) + T + t[C] + g[v]) >>> 0;
      (T = y), (y = w), (w = ROTL(x, 30) >>> 0), (x = m), (m = S);
    }
    (s[0] = (s[0] + m) >>> 0),
      (s[1] = (s[1] + x) >>> 0),
      (s[2] = (s[2] + w) >>> 0),
      (s[3] =
        ((((s[0] + n) >>> 0) ^
          (((268435455 & ROTL(s[1], 16)) + o) >>> 0) ^
          (((1073741823 & s[2]) + r) >>> 0)) +
          i) >>>
        0),
      (s[4] = (s[4] + T) >>> 0);
  }
  return [
    (s[0] >> 24) & 255,
    (s[0] >> 16) & 255,
    (s[0] >> 8) & 255,
    255 & s[0],
    (s[1] >> 24) & 255,
    (s[1] >> 16) & 255,
    (s[1] >> 8) & 255,
    255 & s[1],
    (s[2] >> 24) & 255,
    (s[2] >> 16) & 255,
    (s[2] >> 8) & 255,
    255 & s[2],
    (s[3] >> 24) & 255,
    (s[3] >> 16) & 255,
    (s[3] >> 8) & 255,
    255 & s[3],
    (s[4] >> 24) & 255,
    (s[4] >> 16) & 255,
    (s[4] >> 8) & 255,
    255 & s[4],
  ];
}
function formatV4UUID(e) {
  return (e[6] = (15 & e[6]) | 64), (e[8] = (63 & e[8]) | 128), e;
}
var uuidNonce = 0;
function getUUIDNonce() {
  return ++uuidNonce;
}
function generateNewUUID() {
  return stringifyUUID(
    formatV4UUID(
      sha1forUUID(Date.now() + "-" + getUUIDNonce() + "-" + Math.random())
    )
  );
}
function cpTrack(e, t, n) {
  var o = [
      "Lead",
      "AddToCart",
      "AddPaymentInfo",
      "CompleteRegistration",
      "InitiateCheckout",
      "InitiateCheckout",
      "AddToWishlist",
    ],
    r = [
      ["account_created", "ac_"],
      ["signup", "regform_completed"],
      ["signup", "email_confirmed"],
      ["signup", "doc_uploaded"],
      ["first_deposit", "first_deposit_regform"],
      ["first_deposit", "first_deposit_panel"],
      ["deposit", "deposit"],
      ["regform", "regform_"],
      ["success_login", "success_login"],
      ["signup_page", "signup_page"],
    ];
  if (e < 4 || e > 6) {
    try {
      o[e] && fbq("track", o[e]);
    } catch (e) {}
    sendGAEvent(r[e][0], e && 7 != e ? r[e][1] : r[e][1] + (t || "landing")),
      e || $(document).trigger("cp:accountCreated", { type: t });
  } else {
    try {
      fbq("track", o[e], { value: t, currency: n });
    } catch (e) {}
    var i = { EUR: 1.16, PLN: 0.27, GBP: 1.3 };
    sendGAEvent(r[e][0], r[e][1], "" + i[n] ? parseInt(t * i[n]) : t),
      $.post("/service", {
        mode: "jslog",
        type: "deposit",
        msg:
          n +
          t +
          "|" +
          (i[n] ? parseInt(t * i[n]) : t) +
          (6 == e ? "" : "|first"),
        url: document.location.href,
      });
  }
}
function sendGAEvent(e, t, n) {
  "account_created" == e && cookieGet("__test_55_1", 1) && (t += "_test55_1"),
    "account_created" == e &&
      cookieGet("__test_55_1_0", 1) &&
      (t += "_test55_1_0"),
    "account_created" == e &&
      cookieGet("test39", 1) &&
      (t += "_test39_after_5sec"),
    "account_created" == e && cookieGet("test61", 1) && (t += "_afterTest61");
  var o = { event: "siteEvent", eventCategory: e, eventAction: t };
  n && (o.eventValue = n);
  try {
    dataLayer.push(o);
  } catch (o) {}
}
var processedErrors = {},
  totalErrorsCount = 15;
function getGetParam(e) {
  return window.URLSearchParams
    ? new URLSearchParams(window.location.search).get(e)
    : (v = window.location.search.match(
        new RegExp("(?:^|\\&|\\?)" + e + "=([^$\\#\\&]+)")
      ))
    ? decodeURIComponent(v[1])
    : null;
}
function getTimeZone() {
  var e;
  if (window.Intl && window.Intl.DateTimeFormat)
    e = Intl.DateTimeFormat().resolvedOptions().timeZone;
  else {
    function t(e) {
      return (e < 10 ? "0" : "") + e;
    }
    var n = new Date().getTimezoneOffset();
    e =
      "GMT" +
      ((n < 0 ? "+" : "-") + t(((n = Math.abs(n)) / 60) | 0) + t(n % 60));
  }
  return e;
}
$(window).on("error", function (e) {
  if (!(totalErrorsCount < 0)) {
    totalErrorsCount--;
    var t = e.originalEvent,
      n = "[" + t.lineno + ":" + t.colno + "] " + t.filename + " | " + t.error,
      o = n.substr(0, 200).replace(/[^a-zA-Z0-9]/g, "");
    (processedErrors[o] = processedErrors[o] ? processedErrors[o] + 1 : 1),
      processedErrors[o] > 3 ||
        (t.filename &&
          t.lineno &&
          $.post("/service", {
            mode: "jslog",
            type: "error",
            msg: n,
            url: document.location.href,
          }));
  }
}),
  Array.prototype.find ||
    Object.defineProperty(Array.prototype, "find", {
      value: function (e) {
        if (null == this) throw new TypeError('"this" is null or not defined');
        var t = Object(this),
          n = t.length >>> 0;
        if ("function" != typeof e)
          throw new TypeError("predicate must be a function");
        for (var o = arguments[1], r = 0; r < n; ) {
          var i = t[r];
          if (e.call(o, i, r, t)) return i;
          r++;
        }
      },
    }),
  (window.fbAsyncInit = function () {
    FB.init({
      appId: snAppIdFb,
      autoLogAppEvents: !0,
      xfbml: !0,
      version: "v8.0",
    });
  });
var rerequestEmail,
  loadAttempts = {},
  scriptPathes = {
    FBTracking: "https://connect.facebook.net/en_US/fbevents.js",
    doSNLoginFB: "https://connect.facebook.net/en_US/sdk.js",
    doSNLoginGG: "https://apis.google.com/js/platform.js",
    doSNLoginAP:
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
  },
  doSNLoginFB = loadScriptOnDemand("doSNLoginFB"),
  doSNLoginGG = loadScriptOnDemand("doSNLoginGG"),
  doSNLoginAP = loadScriptOnDemand("doSNLoginAP");
function loadScriptOnDemand(e) {
  return function (t, n) {
    $.getScript(scriptPathes[e])
      .done(function () {
        window[e + "_"](t, n);
      })
      .fail(function () {
        (loadAttempts[e] = loadAttempts[e] ? loadAttempts[e]++ : 1),
          loadAttempts[e] > 10
            ? n("cant load")
            : setTimeout(function () {
                window[e](t, n);
              }, 200);
      });
  };
}
var gcTm,
  doSNLoginFB_ = function (e, t) {
    var n = { scope: "email" };
    rerequestEmail && ((n.auth_type = "rerequest"), (rerequestEmail = !1)),
      FB &&
        FB.login(function (n) {
          n.authResponse &&
            (logged && e
              ? e()
              : FB.api(
                  "/me",
                  { locale: "en_US", fields: "name, email" },
                  function (o) {
                    o.email
                      ? ((uEm = o.email),
                        APICall("auth.facebook.login.token", {
                          deviceId: deviceId,
                          appVersion: appVersion,
                          accessToken: n.authResponse.accessToken,
                          expiresIn: n.authResponse.expiresIn,
                          timezone: getTimeZone(),
                          locale: lnProp || "en",
                        })
                          .then(function (t) {
                            setCookieSessionId(t.sessionToken, t.userId),
                              e && e(t.created);
                          })
                          .catch(function (e, n) {
                            t && t(e, "FB0", n);
                          }))
                      : (FB.logout(),
                        (rerequestEmail = !0),
                        t && t("FB_NO_EMAIL"));
                  }
                ));
        }, n);
  },
  doSNLoginGG_ = function (e, t) {
    gapi &&
      gapi.load("auth2", function () {
        gapi.auth2
          .init()
          .signIn({ prompt: "select_account" })
          .then(function (n) {
            var o = n.getAuthResponse().id_token;
            (uEm = n.getBasicProfile().getEmail()),
              APICall("auth.google.login.token", {
                deviceId: deviceId,
                appVersion: appVersion,
                idToken: o,
                timezone: getTimeZone(),
                locale: lnProp || "en",
              })
                .then(function (t) {
                  setCookieSessionId(t.sessionToken, t.userId),
                    e && e(t.created);
                })
                .catch(function (e, n) {
                  t && t(e, "GL0", n);
                });
          });
      });
  },
  doSNLoginAP_ = function (e, t) {
    AppleID.auth.init({
      clientId:
        appVersion.indexOf(".website.test") > 0
          ? "test.trading.capital.com"
          : "trading.capital.com",
      scope: "email",
      redirectURI: window.location.origin + "/redirect-apple-signin",
      state: "capital",
      nonce: new Date().getTime().toString(),
      usePopup: !0,
    }),
      AppleID.auth
        .signIn()
        .then(function (n) {
          if (n && n.authorization && n.authorization.id_token) {
            try {
              o =
                -1 !==
                (o = JSON.parse(
                  atob(n.authorization.id_token.split(".")[1])
                ).email).indexOf("privaterelay")
                  ? "[email]"
                  : o;
            } catch (e) {
              var o = "[email]";
            }
            (uEm = n && n.user && n.user.email ? n.user.email : o),
              APICall("auth.apple.login.token", {
                deviceId: deviceId,
                appVersion: appVersion,
                idToken: n.authorization.id_token,
                timezone: getTimeZone(),
                locale: lnProp || "en",
              })
                .then(function (t) {
                  setCookieSessionId(t.sessionToken, t.userId),
                    e && e(t.created);
                })
                .catch(function (e, n) {
                  t && t(e, "AL0", n);
                });
          } else t && t("HZ", "AL1", "bad response");
        })
        .catch(function (e) {});
  },
  gcErr = 0;
window.grecaptcha = {
  execute: function (e, t) {
    return {
      then: function (n, o) {
        (window.grecallback = function () {
          clearTimeout(gcTm), window.grecaptcha.execute(e, t).then(n, o);
        }),
          $.getScript(
            "https://www.google.com/recaptcha/api.js?onload=grecallback&render=" +
              e
          )
            .done(function () {
              gcTm = setTimeout(function () {
                window.grecaptcha.execute(e, t).then(n, o);
              }, 4e3);
            })
            .fail(function () {
              ++gcErr > 10
                ? o("cant load")
                : setTimeout(function () {
                    window.grecaptcha.execute(e, t).then(n, o);
                  }, 100);
            });
      },
    };
  },
};
var loginAction,
  loginShow,
  runUserPanel,
  forgotAction,
  forgotShow,
  signupShow,
  signupObj;
function countryDetect() {
  function e(e) {
    $(".rw_change_txt").addClass("hidden"),
      $('.rw_change_txt[data-id="' + e + '"]').removeClass("hidden");
  }
  APICall("country.detect")
    .then(function (n) {
      n &&
      n.countryInfo &&
      n.countryInfo.licenses &&
      n.countryInfo.licenses.length
        ? e(n.countryInfo.licenses[0])
        : e("CYSEC");
    })
    .catch(function (e) {
      setTimeout(countryDetect, 1e3);
    });
}
!(function () {
  var e, n, o, t, s, i, a, l, r, c;
  function d(e) {
    APICall("user.profile.get", {}, e).then(function (e) {
      uEm = e.email;
      try {
        fbqReInit();
      } catch (e) {}
      loginAction && loginAction("logged_code", e.email);
    });
  }
  function _(e) {
    if (
      ("inline" != r || e) &&
      (clearInterval(l),
      n.email.setVal(""),
      n.pass.setVal(""),
      n.code.setVal(""),
      n.btn.off("click"),
      n.signup.off("click"),
      n.forgot.off("click"),
      n.cancel.off("click"),
      n.snLoginFB.off("click"),
      n.snLoginGG.off("click"),
      n.snLoginAP.off("click"),
      n.email.destroy(),
      n.pass.destroy(),
      (n = {}),
      "inline" != r)
    )
      return (
        o.addClass("hidden"),
        t.addClass("hidden"),
        i.removeClass("hidden"),
        a.addClass("hidden"),
        $("body").removeClass("disabled-scroll-body"),
        o.off("keypress"),
        !0
      );
  }
  function u(e) {
    loginAction && loginAction("forgot", n.email.value),
      _(),
      e && e.preventDefault && e.preventDefault();
  }
  function p(e) {
    c
      ? signupShow("href_login", c)
      : loginAction && loginAction("signup", n.email.value),
      _(),
      e && e.preventDefault && e.preventDefault();
  }
  function f(e) {
    loginAction && loginAction("cancel"),
      _(),
      e && e.preventDefault && e.preventDefault();
  }
  function h(t) {
    if (
      (t && t.preventDefault && t.preventDefault(),
      n.email.valid || n.email.fld.focus(),
      !e && !n.btn.hasClass("disabled"))
    ) {
      if (((e = !0), !window.grecaptcha || !window.grecaptcha.execute))
        return void g("HZ", "G1", "please contact support");
      grecaptcha
        .execute("6LeUuLoZAAAAADHg_o02k1zHLlIwCKwmEpnOxnwb", {
          action: "login",
        })
        .then(
          function (t) {
            var s = {
              username: n.email.value,
              password: n.pass.value,
              appVersion: appVersion,
              deviceId: deviceId,
              deviceType: deviceType,
              osType: deviceOS,
              t: t,
            };
            i.hasClass("hidden") && (s.verificationCode = n.code.value),
              APICall("auth.login", s)
                .then(function (t) {
                  function s() {
                    c
                      ? c()
                      : loginAction && loginAction("logged", n.email.value),
                      _(!0),
                      (e = !1);
                  }
                  (logged = !0),
                    l && clearInterval(l),
                    cpTrack(8),
                    setCookieSessionId(t.sessionToken, t.userId),
                    (uEm = n.email.value);
                  try {
                    fbqReInit();
                  } catch (e) {}
                  if ($(".l_rem", o).prop("checked")) var i = 7;
                  else i = 30;
                  APICall(
                    "auth.authToken.generate",
                    {
                      appVersion: appVersion,
                      deviceId: deviceId,
                      validDays: i,
                    },
                    t.sessionToken,
                    !0
                  )
                    .then(function (e) {
                      var n = new Date();
                      n.setTime(n.getTime() + 24 * i * 60 * 60 * 1e3);
                      var o = n.toGMTString();
                      cookieSet("__cp_at", e.authToken, o),
                        cookieSet("__cp_atd", i, o),
                        cookieSet("__cp_att", o, o),
                        s();
                    })
                    .catch(s);
                })
                .catch(function (e, n) {
                  g(e, "L1", n);
                });
          },
          function (e) {
            g("HZ", "G1", e ? ("" + e).substr(0, 40) : "offline");
          }
        );
    }
  }
  function m(e) {
    cpTrack(8),
      c
        ? c()
        : e
        ? "uu" != devicePr && "investing" != devicePr
          ? (document.location.href = "/trading/signup")
          : (document.location.href = "/trading/platform/")
        : (loginAction && loginAction("logged", ""), _());
  }
  function g(o, t, l) {
    switch (
      ((e = !1),
      n.code.value && n.code.setVal(""),
      "TWO_FACTOR_AUTH_REQUIRED" == o || "VERIFICATION_FAILED" == o
        ? (i.addClass("hidden"), a.removeClass("hidden"))
        : (a.addClass("hidden"), i.removeClass("hidden")),
      o)
    ) {
      case "TWO_FACTOR_AUTH_REQUIRED":
        n.code.fld.focus(), v();
        break;
      case "VERIFICATION_FAILED":
        k(_ln.l_2fa_err_ttl, _ln.l_2fa_err_txt);
        break;
      case "REACHED_MAX_FAILED_ATTEMPTS":
        k(_ln.l_login_failed, _ln.l_err_too_many_attempts, [
          _ln.l_forgot_pass,
          u,
        ]);
        break;
      case "USER_NOT_FOUND":
      case "FIELD_VALIDATION_ERROR":
      case "INVALID_LOGIN_OR_PASSWORD":
      case "INVALID_PASSWORD":
        ++s >= 3
          ? k(_ln.l_pass_invalid, "", [_ln.l_forgot_pass, u])
          : k(_ln.l_pass_invalid);
        break;
      case "USER_ACCOUNT_BLOCKED":
        k(_ln.l_acc_locked, _ln.l_err_acc_locked);
        break;
      case "ACCOUNT_CLOSED":
      case "USER_ACCOUNT_CLOSED":
        k(_ln.l_acc_closed, _ln.l_err_acc_closed);
        break;
      case "FB_NO_EMAIL":
        k("", _ln.rg_cant_connect_fb);
        break;
      case "HZ":
        k(
          _ln.l_connection_error,
          _ln.l_err_connection + " (" + t + ": " + l + ")"
        );
        break;
      default:
        k(
          _ln.l_connection_error,
          _ln.l_err_connection + " (" + t + ": " + o + ")"
        );
    }
  }
  function v(e) {
    return (
      !0 !== e && t.addClass("hidden"),
      n.email.valid && n.pass.valid && (a.hasClass("hidden") || n.code.valid)
        ? (n.btn.prop("disabled", !1), n.code.valid && h(), !0)
        : (n.btn.prop("disabled", !0), !1)
    );
  }
  function k(e, n, o) {
    $(".errTitle", t).html(e || ""),
      $(".errDescr", t).html(n || ""),
      o
        ? ($(".errActionWrap", t).show(),
          $(".errAction", t).html(o[0]).off("click").on("click", o[1]))
        : $(".errActionWrap", t).hide(),
      t.removeClass("hidden");
  }
  loginShow = function (e, _) {
    _ && _.mode && (r = _.mode),
      _ && _.exitFn && (c = _.exitFn),
      $("#l_overlay").length
        ? _ && (_.ac || _.at)
          ? (function (e) {
              var n = { deviceId: deviceId, appVersion: appVersion };
              if (e.ac) {
                var o = "auth.authCode.login";
                n.code = e.ac;
              } else
                (o = "auth.authToken.login"),
                  (n.authToken = e.at),
                  (n.refresh = !0);
              APICall(o, n, null, !0)
                .then(function (e) {
                  (logged = !0),
                    cpTrack(8),
                    setCookieSessionId(e.sessionToken, e.userId);
                  var o = e.sessionToken;
                  if (n.refresh) {
                    var t = cookieGet("__cp_atd") || 7;
                    APICall(
                      "auth.authToken.generate",
                      {
                        appVersion: appVersion,
                        deviceId: deviceId,
                        validDays: t,
                      },
                      o,
                      !0
                    )
                      .then(function (e) {
                        var n = new Date();
                        n.setTime(n.getTime() + 24 * t * 60 * 60 * 1e3);
                        var s = cookieGet("__cp_att") || n.toGMTString();
                        cookieSet("__cp_at", e.authToken, s),
                          cookieSet("__cp_atd", t, s),
                          cookieSet("__cp_att", s, s),
                          d(o);
                      })
                      .catch(function () {
                        d(o);
                      });
                  } else d(o);
                })
                .catch(function (e) {});
            })(_)
          : ((o = $("#l_overlay")),
            (t = $(".l_error", o)),
            (i = $(".step0", o)),
            (a = $(".step1", o)),
            (s = 0),
            ((n = {
              btn: $(".l_btn", o),
              signup: $(".l_btn_signup", o),
              forgot: $(".l_btn_forgot", o),
              cancel: $(".l_cancel", o),
              snLoginFB: $(".sn-login-fb", o),
              snLoginGG: $(".sn-login-gg", o),
              snLoginAP: $(".sn-login-ap", o),
            }).email = fieldControl(
              "l_f_email",
              [isRequired, isValidEmail],
              function (e) {
                v(e);
              }
            )),
            (n.pass = fieldControlPassword(
              "l_f_pass",
              [isRequired, isPassDigit, isPassLength, isPassLetter],
              function () {
                v();
              }
            )),
            (n.code = fieldControl(
              "l_f_code",
              [
                isRequired,
                validateCustom(function (e) {
                  return (e = e.replace(/\s+/, "")) && /^\d{6}$/.test(e);
                }),
              ],
              function () {
                v();
              }
            )),
            n.btn.on("click", h),
            n.signup.on("click", p),
            n.forgot.on("click", u),
            n.cancel.on("click", f),
            n.snLoginFB.on("click", function (e) {
              doSNLoginFB(m, g), e.preventDefault();
            }),
            n.snLoginGG.on("click", function (e) {
              doSNLoginGG(m, g), e.preventDefault();
            }),
            n.snLoginAP.on("click", function (e) {
              doSNLoginAP(m, g), e.preventDefault();
            }),
            e && n.email.setVal(e),
            o.removeClass("hidden"),
            $("body").addClass("disabled-scroll-body"),
            $(".modal", o).hide().fadeIn(),
            n.email.fld.focus().change(),
            o.on("keypress", function (e) {
              ("13" != e.keyCode && "13" != e.which) || h();
            }),
            (l = setInterval(function () {
              n.email && n.email.onChange && n.email.onChange(!0);
            }, 1e3)),
            countryDetect())
        : $.get("?t=get_template", { ln: lnProp || "en" }, function (n) {
            $("body").append(n), loginShow(e, _);
          });
  };
})(),
  (function () {
    var e, n, o, t;
    function s() {
      return (
        n.email.setVal(""),
        n.btn.off("click").removeClass("hidden"),
        n.continue.off("click"),
        n.cancel.off("click"),
        n.email.destroy(),
        (n = {}),
        o.addClass("hidden"),
        t.addClass("hidden"),
        $(".f_sent", o).addClass("hidden"),
        $(".f_continue", o).addClass("hidden"),
        $(".f_sent p", o).text(""),
        $("body").removeClass("disabled-scroll-body"),
        o.off("keypress"),
        !0
      );
    }
    function i(e) {
      forgotAction && forgotAction("continue", n.email.value),
        s(),
        e && e.preventDefault && e.preventDefault();
    }
    function a(e) {
      s() && forgotAction && forgotAction("cancel"),
        e && e.preventDefault && e.preventDefault();
    }
    function l() {
      e ||
        (r() &&
          ((e = !0),
          APICall("user.forgotPassword", { email: n.email.value })
            .then(function (t) {
              (e = !1),
                $(".f_sent p", o).text(_ln.f_sent.replace("##", n.email.value)),
                $(".f_sent", o).removeClass("hidden"),
                n.btn.addClass("hidden"),
                $(".f_continue", o).removeClass("hidden");
            })
            .catch(function (n) {
              switch (((e = !1), n)) {
                case "TOO_MUCH_REQUESTS":
                  c(_ln.api_too_many_ttl, _ln.api_too_many_txt);
                  break;
                case "USER_ACCOUNT_BLOCKED":
                  c(_ln.l_acc_locked, _ln.l_err_acc_locked);
                  break;
                case "ACCOUNT_CLOSED":
                case "USER_ACCOUNT_CLOSED":
                  c(_ln.l_acc_closed, _ln.l_err_acc_closed);
                  break;
                case "EMAIL_NOT_FOUND":
                  c(_ln.api_em_not_found_ttl, _ln.api_em_not_found_txt);
                  break;
                default:
                  c(_ln.l_connection_error, _ln.l_err_connection);
              }
            })));
    }
    function r() {
      return (
        t.addClass("hidden"),
        n.email.valid
          ? (n.btn.prop("disabled", !1), !0)
          : (n.btn.prop("disabled", !0), !1)
      );
    }
    function c(e, n, o) {
      $(".errTitle", t).html(e || ""),
        $(".errDescr", t).html(n || ""),
        o
          ? ($(".errActionWrap", t).show(),
            $(".errAction", t).html(o[0]).off("click").on("click", o[1]))
          : $(".errActionWrap", t).hide(),
        t.removeClass("hidden");
    }
    forgotShow = function (e) {
      $("#l_overlay").length
        ? ((o = $("#f_overlay")),
          (t = $(".f_error", "#f_overlay")),
          (n = {
            btn: $(".f_btn", o),
            continue: $(".f_continue", o),
            cancel: $(".f_cancel", o),
          }).btn.on("click", l),
          n.continue.on("click", i),
          n.cancel.on("click", a),
          (n.email = fieldControl(
            "f_f_email",
            [isRequired, isValidEmail],
            function () {
              r();
            }
          )),
          e && n.email.setVal(e),
          o.removeClass("hidden"),
          $(".form-container-small", o).hide().fadeIn(),
          $("body").addClass("disabled-scroll-body"),
          r(),
          o.on("keypress", function (e) {
            ("13" != e.keyCode && "13" != e.which) || l();
          }))
        : $.get("?t=get_template", { ln: lnProp || "en" }, function (e) {
            $("body").append(e), forgotShow();
          });
    };
  })(),
  (signupObj = function (e, n) {
    var o,
      t,
      s = {
        init: function (n, i) {
          function a(e, n) {
            var o = $(".js-tips");
            if ((o.hide(), e && e.popupSetup)) {
              if (e.popupSetup.list)
                for (var t = 0; t < n(license).list.length; t++)
                  o.eq(t).show().find("strong").text(e.popupSetup.list[t]);
              e.popupSetup.title &&
                $(".form-container-small-header.s-between .h1").text(
                  e.popupSetup.title.keyTitle
                ),
                e.popupSetup.btn &&
                  $("#s_overlay .form-container-small-content .s2_btn").text(
                    e.popupSetup.btn.keyBtn
                  );
            } else {
              var s = n(license);
              for (t = 0; t < s.list.length; t++)
                o.eq(t).show().find("strong").text(s.list[t]);
              $(".form-container-small-header.s-between .h1").text(
                s.title.keyTitle
              ),
                $("#s_overlay .form-container-small-content .s2_btn").text(
                  s.btn.keyBtn
                );
            }
          }
          if ("s_overlay" != e || $("#l_overlay").length) {
            if (
              ("function" == typeof setGlobalSignupPopupKeys &&
                a(i, setGlobalSignupPopupKeys),
              !cookieGet("__cp_uid", 1) && "showactimeout30" != n)
            )
              try {
                dataLayer.push({ event: "optimize.activate.ab40" });
              } catch (e) {}
            if (((o = $("#" + e)), "" == lnProp && !window.ab1)) {
              (window.ab1 = !0),
                $(".ab1", o).addClass("hidden"),
                $(".ab1_0", o).removeClass("hidden"),
                (window.ab1_1 = function () {
                  $(".ab1", o).addClass("hidden"),
                    $(".ab1_1", o).removeClass("hidden");
                }),
                (window.ab1_2 = function () {
                  $(".ab1", o).addClass("hidden"),
                    $(".ab1_2", o).removeClass("hidden");
                });
              try {
                dataLayer.push({ event: "optimize.activate.ab1" });
              } catch (e) {}
            }
            var l = this;
            (this.addItems = {
              signupType: n,
              s2_ok0: $(".s2_ok0", o),
              s2_ok1: $(".s2_ok1", o),
              s2_ok2: $(".s2_ok2", o),
              s2_ok3: $(".s2_ok3", o),
              s2_ok4: $(".s2_ok4", o),
              s2_error: $(".s_error", o),
              login_btn: $(".l_btn_signup", o),
              btn: $(".s2_btn", o),
              cancel: $(".s_cancel", o),
              snLoginFB: $(".sn-login-fb", o),
              snLoginGG: $(".sn-login-gg", o),
              snLoginAP: $(".sn-login-ap", o),
            }),
              (this.controls = {
                email: fieldControl(
                  e + "-email",
                  [isRequired, isValidEmail],
                  function () {
                    l.validate();
                  }
                ),
                pass: fieldControlPassword(
                  e + "-pass",
                  [
                    isRequired,
                    isPassDigit,
                    isPassLength,
                    isPassLowLetter,
                    isPassUpLetter,
                    isPassSpecial,
                  ],
                  function () {
                    l.validate();
                  }
                ),
              }),
              this.controls.pass.fld.on("keyup blur", function (e) {
                l.controls.pass.wrapper.hasClass("error")
                  ? l.controls.pass.wrapper.prev().addClass("error")
                  : l.controls.pass.wrapper.prev().removeClass("error");
              }),
              this.controls.email.fld.on("keyup blur", function (e) {
                l.controls.email.wrapper.hasClass("error")
                  ? l.controls.email.wrapper.prev().addClass("error")
                  : l.controls.email.wrapper.prev().removeClass("error");
              }),
              this.controls.pass.setVal(""),
              this.addItems.btn.on("click", function (e) {
                e.preventDefault(), l.submit();
              }),
              this.addItems.login_btn.on("click", function (e) {
                e.preventDefault(),
                  l.destroy(),
                  t ? loginShow("", { exitFn: t }) : loginShow();
              }),
              this.addItems.cancel.on("click", function (e) {
                e.preventDefault(), l.destroy();
              }),
              this.addItems.snLoginFB.on("click", function (e) {
                doSNLoginFB(r, l.processError.bind(l)), e.preventDefault();
              }),
              this.addItems.snLoginGG.on("click", function (e) {
                doSNLoginGG(r, l.processError.bind(l)), e.preventDefault();
              }),
              this.addItems.snLoginAP.on("click", function (e) {
                doSNLoginAP(r, l.processError.bind(l)), e.preventDefault();
              }),
              o.on("keypress", function (e) {
                ("13" != e.keyCode && "13" != e.which) ||
                  (e.preventDefault(), l.submit());
              }),
              o.removeClass("hidden"),
              "s_overlay" == e &&
                ($(".form-container-small", o).hide().fadeIn(),
                $("body").addClass("disabled-scroll-body")),
              countryDetect(),
              this.validate();
          } else
            $.get("?t=get_template", { ln: lnProp || "en" }, function (e) {
              $("body").append(e),
                "function" == typeof setGlobalSignupPopupKeys &&
                  a(i, setGlobalSignupPopupKeys),
                s.init(n, i);
            });
          function r(e) {
            cpTrack(
              0,
              l.addItems.signupType ? l.addItems.signupType : "homepage"
            ),
              s.exit();
          }
        },
        destroy: function () {
          "s_overlay" == e &&
            (this.controls.email.setVal("").fld.blur(),
            this.controls.pass.setVal("").fld.blur(),
            this.controls.email.destroy(),
            this.controls.pass.destroy(),
            this.addItems.btn.off("click"),
            this.addItems.login_btn.off("click"),
            this.addItems.cancel.off("click"),
            this.addItems.snLoginFB.off("click"),
            this.addItems.snLoginGG.off("click"),
            this.addItems.snLoginAP.off("click"),
            $(o).off("keypress"),
            o.addClass("hidden"),
            this.addItems.s2_error.addClass("hidden"),
            $("body").removeClass("disabled-scroll-body"));
        },
        lock: function (e) {
          (this.locked = !0),
            this.addItems.btn
              .removeClass("disabled hasPointer progress")
              .addClass(e || "disabled");
        },
        unlock: function () {
          (this.locked = !1),
            this.addItems.btn.removeClass("disabled hasPointer progress");
        },
        API: function (e, n, o) {
          var t = promise(s);
          return (
            APICall(e, n, o)
              .then(function (e) {
                t.resolve(e);
              })
              .catch(function (e, n) {
                t.reject(e, n);
              }),
            t
          );
        },
        submit: function (e) {
          if (
            (this.controls.email.valid
              ? this.controls.pass.valid || this.controls.pass.fld.focus()
              : this.controls.email.fld.focus(),
            !this.locked)
          ) {
            "uu" != uCountry && uCountry.toLowerCase();
            this.lock("progress");
            var o = {
              username: this.controls.email.value,
              password: this.controls.pass.value,
              timezone: getTimeZone(),
              locale: lnProp || "en",
            };
            n && (o.confCode = n),
              this.API("user.register", o)
                .then(function () {
                  (this.email = this.controls.email.value),
                    cpTrack(
                      0,
                      this.addItems.signupType
                        ? this.addItems.signupType
                        : "homepage"
                    ),
                    $.post("/service", {
                      mode: "banner",
                      action: "created",
                      type: this.addItems.signupType,
                    }),
                    this.loginTry(!0);
                })
                .catch(function (e, n) {
                  this.processError(e, "R0", n);
                });
          }
        },
        loginTry: function (e) {
          window.grecaptcha && window.grecaptcha.execute
            ? grecaptcha
                .execute("6LeUuLoZAAAAADHg_o02k1zHLlIwCKwmEpnOxnwb", {
                  action: "login",
                })
                .then(
                  function (n) {
                    s.loginTry1(e, n);
                  },
                  function (e) {
                    s.processError(
                      "HZ",
                      "G0",
                      e ? ("" + e).substr(0, 40) : "offline"
                    );
                  }
                )
            : s.processError("HZ", "G0", "please contact support");
        },
        loginTry1: function (e, n) {
          this.API("auth.login", {
            username: this.controls.email.value,
            password: this.controls.pass.value,
            appVersion: appVersion,
            deviceId: deviceId,
            deviceType: deviceType,
            osType: deviceOS,
            t: n,
          })
            .then(function (n) {
              try {
                fbqReInit();
              } catch (e) {}
              setCookieSessionId(n.sessionToken, n.userId), s.exit(e);
            })
            .catch(function (e, n) {
              this.processError(e, "L0", n);
            });
        },
        validate: function () {
          this.addItems.s2_error.addClass("hidden"),
            this.controls.pass.errors.passlength
              ? this.addItems.s2_ok0.removeClass("active")
              : this.addItems.s2_ok0.addClass("active"),
            this.controls.pass.errors.passdigit
              ? this.addItems.s2_ok1.removeClass("active")
              : this.addItems.s2_ok1.addClass("active"),
            this.controls.pass.errors.passlowletter
              ? this.addItems.s2_ok2.removeClass("active")
              : this.addItems.s2_ok2.addClass("active"),
            this.controls.pass.errors.passupletter
              ? this.addItems.s2_ok3.removeClass("active")
              : this.addItems.s2_ok3.addClass("active"),
            this.controls.pass.errors.passspecial
              ? this.addItems.s2_ok4.removeClass("active")
              : this.addItems.s2_ok4.addClass("active"),
            this.controls.email.valid && this.controls.pass.valid
              ? this.unlock()
              : this.lock("disabled hasPointer");
        },
        processError: function (e, n, o) {
          if ("USER_ALREADY_EXISTS" != e)
            this.unlock(),
              "INVALID_PASSWORD" == e ||
              "INVALID_LOGIN_OR_PASSWORD" == e ||
              "TWO_FACTOR_AUTH_REQUIRED" == e
                ? (this.showError(
                    _ln.api_err_exists_ttl,
                    _ln.api_err_exists_txt
                  ),
                  $(".errDescr", this.addItems.s2_error)
                    .find("A")
                    .on("click", function (e) {
                      return (
                        s.destroy(),
                        t ? loginShow("", { exitFn: t }) : loginShow(),
                        e.preventDefault(),
                        !1
                      );
                    }))
                : "REACHED_MAX_FAILED_ATTEMPTS" == e
                ? this.showError(
                    _ln.l_login_failed,
                    _ln.l_err_too_many_attempts
                  )
                : "USER_ACCOUNT_CLOSED" == e
                ? this.showError(_ln.l_acc_closed, _ln.l_err_acc_closed)
                : "USER_ACCOUNT_BLOCKED" == e
                ? this.showError(_ln.l_acc_locked, _ln.l_err_acc_locked)
                : "FB_NO_EMAIL" == e
                ? this.showError("", _ln.rg_cant_connect_fb)
                : "HZ" == e
                ? this.showError(
                    _ln.l_connection_error,
                    _ln.l_err_connection + " (" + n + ": " + o + ")"
                  )
                : this.showError(
                    _ln.l_connection_error,
                    _ln.l_err_connection + " (" + n + ": " + e + ")"
                  );
          else {
            if ("uu" != devicePr && "investing" != devicePr) {
              var i = $(".js-mobilApp").attr("href"),
                a = _ln.rg_already_exists_mob.replace("##appUrl##", i);
              return void this.showError("", a);
            }
            this.loginTry();
          }
        },
        showError: function (e, n) {
          $(".errTitle", this.addItems.s2_error).html(e),
            $(".errDescr", this.addItems.s2_error).html(n),
            this.addItems.s2_error.removeClass("hidden"),
            setTimeout(function () {
              s.addItems.s2_error.addClass("hidden");
            }, 8e3);
        },
        exit: function (e) {
          t
            ? (t(), this.destroy())
            : $("#s_overlay_exit").length && (e || window.stockMode)
            ? ($("#s_overlay_exit").removeClass("hidden"), e && this.destroy())
            : e || "uu" != devicePr
            ? (document.location.href = "/trading/signup")
            : (document.location.href = "/trading/platform");
        },
      };
    signupShow = function (n, o, i) {
      (t = o), logged && "s_overlay" == e ? s.exit() : s.init(n, i);
    };
  })("s_overlay");
var loginCallback,
  isTouch = "ontouchstart" in window || navigator.msMaxTouchPoints > 0;
function checkSlickDots() {
  var e = $(".slick-dots");
  $(".slick-dots li").length < 2 ? e.hide() : e.show();
}
isTouch && $("html").addClass("has-touch"),
  (jQuery.QueryString = (function (e) {
    if ("" == e) return {};
    for (var t = {}, n = 0; n < e.length; ++n) {
      var i = e[n].split("=", 2);
      2 == i.length && (t[i[0]] = decodeURIComponent(i[1].replace(/\+/g, " ")));
    }
    return t;
  })(window.location.search.substr(1).split("&")));
var tm,
  iqtm,
  wnd = $(window),
  sentActivateEvent = { 23: !1 },
  allButtons = [],
  showButtons = [];
(allButtons = getAllSBtns()),
  $(document).ready(function () {
    var e,
      t = $(window).height(),
      n = ($(document).height(), 1e6),
      i = !0;
    function a(a) {
      i &&
        n < t + a &&
        ((i = !1),
        cpTrackS("end"),
        e &&
          e.data("id") &&
          $.post("/service", {
            mode: "siteEvent",
            eventName: "DocumentRead",
            type: "articles",
            id: e.data("id"),
            language: lnProp || "en",
          }));
    }
    if (
      (wnd
        .on("resize", function () {
          (t = wnd.height()),
            $(document).height(),
            (n = (function () {
              if ((e = $(".contentEnd")).length)
                return e.height() + e.position().top + 100;
              if ((e = $(".page-content-area").last()).length)
                return e.height() + e.position().top - 150;
              if ((e = $(".partners > .row-cont")).length)
                return e.position().top;
              return 500;
            })()),
            a(0),
            checkSlickDots(),
            getOnResize(),
            checkVisible();
        })
        .resize(),
      wnd.on("scroll", function () {
        a(wnd.scrollTop()),
          tm && clearTimeout(tm),
          (tm = setTimeout(function () {
            allButtons.length && checkVisible();
          }, 100));
      }),
      $(".field-form").each(function () {
        $(this).focusin(function () {
          $(this)
            .parents(".form-group")
            .find(".label-form")
            .addClass("focused"),
            "" != $(this).val() && $(this).addClass("typing");
        }),
          $(this).focusout(function () {
            $(this)
              .parents(".form-group")
              .find(".label-form")
              .removeClass("focused");
          }),
          $(this).keyup(function () {
            "" == $(this).val() && $(this).hasClass("typing")
              ? $(this).removeClass("typing")
              : "" == $(this).val() ||
                $(this).hasClass("typing") ||
                $(this).addClass("typing");
          });
      }),
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
        ? $(".cCnav").addClass("ipad-pro")
        : $(".cCnav").removeClass("ipad-pro"),
      $(".js-footerMenu").on("click", function (e) {
        if (window.innerWidth < 1024) {
          e.preventDefault();
          var t = this.dataset.control;
          $(this).toggleClass("active"),
            $('[data-target="' + t + '"]').toggleClass("active");
        }
      }),
      $(".js-riskWarn").on("click", function () {
        $(window).width() <= 767 &&
          ($(this).toggleClass("active"), headerItemHeight());
      }),
      $("#scrollToTop").length && $(window).width() > 1023)
    ) {
      var s = $(window).height();
      $(window).scroll(function () {
        $(window).scrollTop() > s
          ? $("#scrollToTop").addClass("active")
          : $("#scrollToTop").removeClass("active");
      }),
        $("#scrollToTop").click(function () {
          $("html, body").animate({ scrollTop: 0 }, 500);
        });
    }
    var o = "" + document.cookie;
    if (!o.match(new RegExp("cookieusage=1"))) {
      var r = $(".js-mainCookies"),
        c = $(".js-cookieClose"),
        l = $(".stickyBar__wrap", ".js-stickyBar");
      r.show(),
        l.addClass("stickyBar__wrap--cookie"),
        c.on("click", function () {
          (document.cookie =
            "cookieusage=1; expires=Thu, 01 Jan 2025 00:00:01 UTC; path=/;"),
            r.hide(),
            l.removeClass("stickyBar__wrap--cookie"),
            headerItemHeight();
        });
    }
    $(".footer__button").length &&
      (o.match(new RegExp("closeFooterPanel=1"))
        ? $(".footer-site").addClass("_noFooterPanel")
        : ($(".footer-site").addClass("_withFooterPanel"),
          $("#footerPanelClose").on("click", function () {
            (document.cookie = "closeFooterPanel=1;"),
              $(".footer-site")
                .removeClass("_withFooterPanel")
                .addClass("_noFooterPanel");
          }))),
      $(".openBox, .closeBox").on("click", function (e) {
        e.preventDefault(),
          $(this).parents(".sharesFixed").toggleClass("_show");
      }),
      (window.onpageshow = function (e) {
        e.persisted &&
          ($("#flt_all").length && doSearchRequest(),
          $("#iqf").length && iqDoSearch());
      }),
      $(
        ".socials_button_facebook,.socials_button_twitter,.socials_button_linkedin"
      ).on("click", function (e) {
        var t,
          n = 350,
          i = 520,
          a = screen.height / 2 - n / 2,
          s = screen.width / 2 - i / 2;
        $(this).hasClass("socials_button_facebook") &&
          (t =
            "http://www.facebook.com/sharer.php?s=100&u=" +
            encodeURIComponent(document.URL)) &&
          cpTrackS("at_fb"),
          $(this).hasClass("socials_button_linkedin") &&
            ((t =
              "https://www.linkedin.com/shareArticle?mini=true&url=" +
              encodeURIComponent(document.URL) +
              "&title=" +
              encodeURIComponent(document.title)),
            (i = 975),
            (n = 690)) &&
            cpTrackS("at_ln"),
          $(this).hasClass("socials_button_twitter") &&
            ((t =
              "http://twitter.com/intent/tweet?text=" +
              encodeURIComponent(document.title + " " + document.URL)),
            (i = 680),
            (n = 450)) &&
            cpTrackS("at_tw"),
          e.preventDefault(),
          window.open(
            t,
            "sharer",
            "top=" +
              a +
              ",left=" +
              s +
              ",toolbar=0,status=0,width=" +
              i +
              ",height=" +
              n
          );
      }),
      setTimeout(function () {
        var e = $("#hpBannerVideo");
        e.prop("src", e.data("src")),
          e
            .parent()
            .on("load", function () {
              e.parent().hide().fadeIn();
            })
            .load();
      }, 1500),
      checkTrustLogo(),
      initSentimentWidgets(),
      logged
        ? sendGAEvent("PageView", "logged_user")
        : document.cookie.match(new RegExp("__cp_uid=([0-9]+)")) &&
          sendGAEvent("PageView", "prev_logged_user");
  });
var sTM,
  chart,
  itypes = {
    COM: "Commodities",
    IND: "Indices",
    SHARE: "Shares",
    CURRENCY: "Currency",
    CRYPTO: "Cryptocurrency",
  },
  sfrm = $("#sfrm1");
function initIQ() {
  $("#iqf").on("keyup change", function () {
    iqtm && clearTimeout(iqtm), (iqtm = setTimeout(iqDoSearch, 200));
  }),
    $("#iqfESG").on("keyup change", function () {
      iqtm && clearTimeout(iqtm), (iqtm = setTimeout(iqDoSearchESG, 200));
    }),
    $("#iqr").on("click", function () {
      $("#iqw,#iqrs,#iqnf").hide(), $("#iqf").val("");
    }),
    $("#iqrs").on("click", function (e) {
      var t = $(e.target).parents("li");
      t.length && t.data("url") && (document.location.href = t.data("url"));
    }),
    $("body").on("click", function (e) {
      sfrm.parent().find($(e.target)).length || $("#iqf").val("");
    });
}
function iqDoSearch() {
  $("#iqf").val()
    ? $.get(
        "/service",
        {
          q: $("#iqf").val(),
          stock: $("#iqf").data("realstock"),
          source: $("#iqf").data("source"),
        },
        function (e) {
          if (
            (e && (e = JSON.parse(e)),
            $("#iqw").show(),
            $("#iqrs").hide().html(""),
            e && e.length)
          ) {
            for (var t = 0; t < e.length && t < 10; t++) {
              var n = e[t];
              "esgRating" === $("#iqf").data("source")
                ? $("#iqrs").append(
                    '<li data-url="' +
                      n.URL +
                      '"><b class="stringEllipsed">' +
                      n.SHORT_TITLE +
                      '</b><span class="textSub stringEllipsed">' +
                      n.DISPLAY_TITLE +
                      "</span></li>"
                  )
                : $("#iqrs").append(
                    '<li data-url="' +
                      n.URL +
                      '"><div class="instrument-type">' +
                      itypes[n.TYPE] +
                      '</div><div class="instrument-short">' +
                      n.SHORT_TITLE +
                      '</div><div class="instrument-full">' +
                      n.TITLE +
                      "</div></li>"
                  );
            }
            $("#iqnf").hide(), $("#iqrs").show();
          } else $("#iqnf").slideDown();
        }
      )
    : ($("#iqw,#iqrs,#iqnf").hide(), $("#iqf").val(""));
}
function iqDoSearchESG() {
  var e = $("#iqfESG");
  e.val() &&
    $.get("/service", { q: e.val(), source: e.data("source") }, function (e) {
      if ((e && (e = JSON.parse(e)), e && e.length)) {
        $(".esg .table tr").remove();
        for (var t = 0; t < e.length && t < 10; t++) {
          var n = e[t];
          $(".esg .table tbody").append(
            '<tr><td><a href="' +
              n.URL +
              '"><b class="stringEllipsed">' +
              n.SHORT_TITLE +
              " " +
              n.DISPLAY_TITLE +
              '</b><span class="table__info stringEllipsed">Company report currency: ' +
              n.company_report_currency +
              '</span></a></td><td><span class="nowrap">' +
              n.letter +
              '</span></td><td><div class="esg__bar ' +
              n.class +
              '"></div></td><td>' +
              n.risk_rating +
              "</td></tr>"
          );
        }
      }
    });
}
function doSearchFlow() {
  $("input[type='checkbox']", "#flt_all").on("change click", function () {
    var e = $(this);
    $(".label_" + e.val()).remove(), doSearch();
  });
}
function doSearch() {
  var e = [],
    t = [],
    n = [];
  $("input:checked", "#flt_sec").each(function () {
    e.push($(this).val());
  }),
    $("input:checked", "#flt_ind").each(function () {
      t.push($(this).val());
    }),
    $("input:checked", "#flt_reg").each(function () {
      n.push($(this).val());
    });
  var i = { sec: e.join(","), ind: t.join(","), reg: n.join(","), t: "ajax" };
  $.post(
    document.location.pathname + (iSort ? "?t=" + iSort : ""),
    i,
    function (e) {
      $("#search_results").stop(!0, !0).html(e),
        livePricesunSubscribe(),
        livePricesSubscribe(),
        activateILinks();
    }
  );
}
function activateILinks() {
  $("input:checked", "#flt_all").each(function () {
    var e = $(this);
    $(".label_" + e.val()).remove(),
      $("#flt_labels").append(
        '<span class="filter-item label_' +
          e.val() +
          '" ><span class="text-ellipsis">' +
          e.next().text() +
          '</span> <span class="cross-button" onclick="$(\'#ch_' +
          e.val() +
          "').prop('checked', false).change()\"></span></span>"
      );
  }),
    $("tr.trlink").on("click", function (e) {
      var t = $(this).data("type");
      t && sendGAEvent("click_trLink", "click_" + t);
      var n = $("a", this).attr("href");
      return (
        n &&
          setTimeout(function () {
            document.location.href = n;
          }, 100),
        !1
      );
    }),
    $(".notrlink").on("click", function (e) {
      var t = $(this).data("type");
      t && sendGAEvent("click_noTrLink", "click_" + t);
      var n = $(this).attr("href");
      return (
        n &&
          setTimeout(function () {
            document.location.href = n;
          }, 100),
        !1
      );
    });
}
sfrm.on("submit", function (e) {
  e.preventDefault();
}),
  initIQ();
var chartType = 3,
  chartPeriod = "H1",
  chartPeriodMap = {
    M1: 1,
    M5: 5,
    M15: 15,
    M30: 30,
    H1: 60,
    H4: 240,
    D1: 1440,
    W1: 10080,
  },
  chartCache = {},
  prevWidth = $(window).outerWidth();
function initChart(e, t) {
  window.umstelAPI &&
    ((chart = window.umstelAPI.createChart("chartwrap")).loaded
      ? getChartData(e, chartPeriod, 200)
      : (chart.onload = function (n) {
          (chart = n).setSettings({
            b: { d: chartType, e: 10 },
            g: { k: { s4: 0 } },
          }),
            chart.setChartHistoryLoader({
              loadMore: function (t, n) {
                13 === t.toString().length
                  ? (t /= 1e3)
                  : 16 === t.toString().length && (t /= 1e6),
                  getChartData(e, chartPeriod, 200, t, n);
              },
            }),
            getChartData(e, chartPeriod, 200),
            $(window).on("resize", function () {
              var t = $(window).outerWidth();
              prevWidth !== t &&
                (chart && chart.destroy && chart.destroy(), initChart(e)),
                (prevWidth = t);
            }),
            t && (chart && chart.destroy && chart.destroy(), initChart(e));
        }));
}
function initChartHandlers(e) {
  var t = $("#chartPeriodsWrap");
  1 === t.length &&
    t.find(".js-chart-period").on("click", function () {
      t.find(".js-chart-period.active").removeClass("active"),
        (chartPeriod = $(this).addClass("active").data("period")),
        chart && chart.destroy && chart.destroy(),
        initChart(e);
    });
}
function getChartData(e, t, n, i, a) {
  if (
    (["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"].indexOf(t) < 0 &&
      (t = "H1"),
    chartCache[t + "_" + i] && a)
  )
    0 == chartCache[t + "_" + i].time.length
      ? a.reject()
      : a.resolve(chartCache[t + "_" + i]);
  else {
    var s = { instrumentId: e, timeframe: "" + t, depth: n };
    i && (s.timestamp = i);
    var o = pURL + "/trading/v1/quoteHistory";
    $.ajax({
      url: o,
      type: "POST",
      data: JSON.stringify(s),
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      error: function () {
        $("#chartwrap").hide(),
          $("#chartPeriodsWrap").hide(),
          $("#chartConnectionErr").show();
      },
      success: function (e) {
        if (e) {
          $("#chartConnectionErr").hide(),
            $("#chartwrap").show(),
            $("#chartPeriodsWrap").css("display", "flex");
          var n = [],
            s = [],
            o = [],
            r = [],
            c = [],
            l = [];
          for (var d in e.history)
            n.push(e.history[d].timestamp),
              s.push(e.history[d].open),
              o.push(e.history[d].high),
              r.push(e.history[d].low),
              c.push(e.history[d].close),
              l.push(0);
          var u = {
            time: n.reverse(),
            high: o.reverse(),
            low: r.reverse(),
            open: s.reverse(),
            close: c.reverse(),
            volume: l.reverse(),
          };
          (chartCache[t + "_" + i] = u),
            a
              ? 0 == u.time.length
                ? a.reject()
                : a.resolve(u)
              : (chart.setData(u),
                chart.setDigits(chartDigits),
                chart.build(),
                chart.setPeriod(chartPeriodMap["" + t]),
                chart.changeChartMode("WEBSITE"),
                e.history.length &&
                  chart.updateLiveData(
                    e.history[0].timestamp,
                    e.history[0].close,
                    e.history[0].close,
                    0
                  ));
        } else
          $("#chartwrap").hide(),
            $("#chartPeriodsWrap").hide(),
            $("#chartConnectionErr").show();
      },
    });
  }
}
var idPID,
  pusher,
  LPIds = [],
  LPFn = {},
  bulkSubscription = {};
function livePricesInitPusher() {
  pusher ||
    ((pusher = new Pusher("app_key", {
      enabledTransports: ["ws"],
      wsHost: "prod-pusher.backend-capital.com",
      disableStats: !0,
    })).connection.strategy.transports.ws.transport.manager.livesLeft = 1e6);
}
var channelsCfg = {
  mostTraded: [
    "1387370618105648466",
    "1147941679092932",
    "233222956170433732",
    "27041281599427780",
    "1361805280629956",
    "16150730595456196",
    "253454610158788",
    "23680534114817220",
    "2608990769463517",
    "23381802046660",
    "145998823326404",
    "196009422516368",
    "508931114652423506",
    "123763777643545",
    "1679716659553719492",
    "3534607760839876",
    "1526559147980517520",
    "5982292443480285",
    "15839732013552836",
    "15854807348761796",
    "426627691533508",
    "56659208610841",
    "10500838556456274",
    "55022826116292",
    "21812064427192838",
    "123763777688772",
    "374675767046662",
    "357654811661650",
    "2604592722367826",
    "12241936693896217",
    "22928193283511492",
    "21217138471056",
    "93810675708048",
    "426696411010244",
    "2503691055748292",
    "374675767046212",
    "27342779714191581",
    "96683858476406084",
    "15871553426248900",
    "14972685490672836",
    "7090522854282578",
    "7092687517865156",
    "355241040048272",
    "554050868420",
    "77073188213956",
    "22734159545980100",
    "24037630580708548",
    "389605073441988",
    "322264281208004",
    "427748677997764",
    "21680337780298948",
    "27342779713672388",
    "289780923770099026",
    "27236401963685060",
    "5898729559250116",
    "422839530378436",
    "21674419315365060",
    "426090820621508",
    "5983666832495812",
    "213309550777682",
    "19495840104142020",
    "15989072321336658",
    "2306899949212868",
    "22855552501634244",
    "95150705504400",
    "27342779713606994",
    "93810675721241",
    "235355617928217",
    "374675767075865",
    "22841379109557444",
    "453930102762329284",
    "123763777613892",
    "93810675684676",
    "1391703943755153629",
    "22841379110076637",
    "27045129890124996",
    "246647086965707",
    "13863591790859460",
    "7091880064013508",
    "11511092173952196",
    "1657857463492",
    "93810675692038",
    "27113256661893341",
    "23381802001433",
    "317535522215108",
    "3698542367560900",
    "93810675691588",
    "7090561509053636",
    "6810413677172050",
    "21530615220351428",
    "162242389693636",
    "6015105993037138",
    "2605692234580189",
    "93810675766468",
    "21182778791108",
    "457749024515097",
    "25985050357018692",
    "2604592722433220",
    "18425409712196",
  ],
  cryptos: [
    "2604592722433220",
    "27342779713672388",
    "13863591790859460",
    "5983666832495812",
    "2604592722367826",
    "5983666832430418",
    "13863591790794066",
    "27342779713606994",
    "5983666833015005",
    "13863591791378653",
    "27342779714191581",
    "2306899949212868",
    "2306899949732061",
    "27236401963685060",
    "22841379109557444",
    "15854807348761796",
    "5898729559250116",
    "5898729559769309",
    "22841379110076637",
    "19495840104661213",
    "1196668083585245",
    "15854807349280989",
    "27236401964204253",
    "27113256661893341",
    "19495840104142020",
    "2605692234580189",
    "5982292443480285",
    "1391703943755153629",
    "2608990769463517",
    "2604592722421058",
    "5983666832483650",
    "2604592722355790",
    "5983666832418382",
    "2306899949147474",
    "2306899949135438",
    "2306899949200706",
  ],
  commodities: [
    "27045129890124996",
    "27041281599427780",
    "422839530378436",
    "427748677997764",
    "426090820621508",
    "426627691533508",
    "426696411010244",
    "110840221095108",
    "7090561509053636",
    "7090488494609604",
    "7093048295059600",
    "7094882246153412",
    "7094972440466628",
    "7090479904616592",
    "7094654612886724",
    "7093817094264004",
    "453930102762329284",
    "7090522854282578",
    "7091880064013508",
    "7092687517865156",
  ],
};
function livePricesSubscribe() {
  for (var e in ($("[data-iid]").each(function () {
    var e = $(this).data("iid"),
      t = getUpdateFn($(this), e);
    LPIds.push("" + e), LPFn[e] ? LPFn[e].push(t) : (LPFn[e] = [t]);
  }),
  LPFn))
    LPFn[e].forEach(function (t) {
      pusher.subscribe("" + e).bind("bbo", t);
    });
  LPIds.length &&
    (console.log("BULK update  all markets subscribed", Object.keys(LPFn)),
    $.ajax({
      url: pURL + "/trading/v1/quoteCurrent",
      type: "POST",
      data: JSON.stringify({ instrumentId: LPIds }),
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      error: function () {},
      success: function (e) {
        if (e)
          for (var t in e.quotes)
            LPFn[e.quotes[t].instrumentId] &&
              LPFn[e.quotes[t].instrumentId].forEach(function (n) {
                n(e.quotes[t]);
              });
      },
    }));
}
function livePricesBulkUpdate(e) {
  var t = [];
  e.forEach(function (e) {
    LPFn[e.instrumentId]
      ? LPFn[e.instrumentId].forEach(function (t) {
          t(e);
        })
      : t.push(e.instrumentId);
  }),
    t.length && console.log("BULK update cant find market: ", t);
}
function livePricesUnsubscribe(e) {
  e = "" + e;
  var t = pusher.channel(e);
  t && (t.unbind(), pusher.unsubscribe(e));
}
function livePricesunSubscribe() {
  for (var e in LPIds) livePricesUnsubscribe(LPIds[e]);
  bulkSubscription.mostTraded && livePricesUnsubscribe("mostTraded"),
    bulkSubscription.commodities && livePricesUnsubscribe("commodities"),
    bulkSubscription.cryptos && livePricesUnsubscribe("cryptos"),
    (LPIds = []),
    (LPFn = {}),
    (bulkSubscription = {});
}
function getUpdateFn(e, t) {
  var n = $(".sell > .table-tools__price,.sell > .price", e),
    i = $(".buy > .table-tools__price,.buy > .price", e),
    a = $(".js-price-buy", e),
    s = $(".js-price-sell", e),
    o = $(".js-low-price", e),
    r = $(".js-high-price", e),
    c = $(".js-spread", e),
    l = e.data("dg");
  return function (e) {
    var d = n.text();
    if (e.bid != d && "-" != d && e.bid) {
      n.removeClass("positive-price negative-price");
      var u = +d > e.bid ? "negative-price" : "positive-price";
      setTimeout(function () {
        n.addClass(u);
      }, 30);
    }
    var h = e.bid ? (+e.bid).toFixed(l) : "-";
    n.text(h), a.text(h);
    d = i.text();
    if (e.ask != d && "-" != d && e.ask) {
      i.removeClass("positive-price negative-price");
      var p = +d > e.ask ? "negative-price" : "positive-price";
      setTimeout(function () {
        i.addClass(p);
      }, 30);
    }
    var v,
      f = e.ask ? (+e.ask).toFixed(l) : "-";
    i.text(f),
      s.text(f),
      (v = f),
      o.each(function (e, t) {
        var n = $(t),
          i = parseFloat(n.text());
        (Number.isNaN(i) || i > v) && n.text(v);
      }),
      (function (e) {
        r.each(function (t, n) {
          var i = $(n),
            a = parseFloat(i.text());
          (Number.isNaN(a) || a < e) && i.text(e);
        });
      })(f),
      e.bid && e.ask
        ? (c.text((+e.ask - +e.bid).toFixed(l)),
          chart &&
            chart.updateLiveData &&
            e.ts &&
            idPID &&
            idPID == t &&
            (chart.updateLiveData(e.timestamp, e.bid, e.bid, 0), chart.fill()))
        : c.text("-");
  };
}
var test48_cookieName,
  test48_vote,
  loginAction,
  forgotAction,
  TimeAgo = (function () {
    var e = {
      inWords: function (e, t) {
        10 === e.toString().length && (e = 1e3 * parseInt(e));
        var n = Math.floor((new Date() - parseInt(e)) / 1e3);
        if (n > 86400) {
          var i = _ln.j_monthes.replace(/،/g, ",").split(","),
            a = new Date(e),
            s = a.getHours(),
            o = a.getMinutes(),
            r = "";
          if (t) {
            var c = a.getUTCHours(),
              l = a.getUTCMinutes();
            r =
              (c < 10 ? "0" + c : c) +
              ":" +
              (l < 10 ? "0" + l : l) +
              " (UTC), " +
              a.getUTCDate() +
              " " +
              i[a.getUTCMonth()] +
              " " +
              a.getUTCFullYear();
          } else
            r =
              (s < 10 ? "0" + s : s) +
              ":" +
              (o < 10 ? "0" + o : o) +
              ", " +
              a.getDate() +
              " " +
              i[a.getMonth()] +
              " " +
              a.getFullYear();
          return r;
        }
        return n < 120
          ? _ln.j_min_ago
          : n < 3600
          ? _ln.j_mins_ago.replace("##", (n / 60).toFixed(0))
          : n < 7200
          ? _ln.j_hour_ago
          : _ln.j_hours_ago.replace("##", (n / 3600).toFixed(0));
      },
    };
    return e;
  })();
function test48_setVote() {
  (document.cookie =
    test48_cookieName +
    "=" +
    test48_vote +
    "; expires=" +
    new Date(Date.now() + 864e5).toGMTString() +
    "; path=/;"),
    setTimeout(location.reload(), 100);
}
function goPlatformDemo() {
  var e = "USD";
  "gb" == uCountry || "ie" == uCountry
    ? (e = "GBP")
    : "pl" == uCountry
    ? (e = "PLN")
    : [
        "ua",
        "at",
        "be",
        "bg",
        "hr",
        "cy",
        "cz",
        "dk",
        "ee",
        "fi",
        "fr",
        "de",
        "gr",
        "hu",
        "ie",
        "it",
        "lv",
        "lt",
        "lu",
        "mt",
        "nl",
        "pt",
        "ro",
        "sk",
        "si",
        "es",
        "se",
      ].indexOf(uCountry) > -1 && (e = "EUR"),
    APICall(
      "account.create",
      { currency: e + "d", settings: { is_default: !0 } },
      getSID()
    )
      .then(function (e) {
        document.location.href = "/trading/platform?accountId=" + e.accountId;
      })
      .catch(function (e) {
        document.location.href = "/trading/platform";
      });
}
function sbtnClick(e, t, n) {
  e.preventDefault(),
    (window.popupOpened = !0),
    setTimeout(function () {
      try {
        dataLayer.push({ event: "optimize.activate.ab43" });
      } catch (e) {}
    }, 250),
    (t = t || $(this).data("type")),
    (n = n || $(this).data("demomode")),
    t && n && (t += "_demo"),
    cpTrackS(t || "s_o"),
    $(document).trigger("cp:signupClick", { type: t }),
    "test-48-2-vote-bull" == t || "test-48-2-vote-bear" == t
      ? ((test48_vote = t),
        (test48_cookieName = $(this).attr("data-cookieName")),
        signupShow(t, test48_setVote))
      : "uu" == devicePr || window.stockMode
      ? signupShow(t, n ? goPlatformDemo : null)
      : setTimeout(function () {
          document.location.href = "/trading/signup?src=" + (t || "u");
        }, 250);
}
function ABTest(e, t) {
  return {
    testName: e,
    currentVariant: null,
    started: !1,
    chooseVariant: function () {
      var n = "__cp_AB_" + e + "_var",
        i = cookieGet(n);
      if (i) this.currentVariant = i;
      else {
        var a = Object.keys(t),
          s = a[~~(Math.random() * a.length)];
        cookieSet(n, s), (this.currentVariant = s);
      }
      return (this.started = !0), this.currentVariant;
    },
    run: function () {
      var e = this.chooseVariant();
      t[e](), this.sendEvent("start", 0);
    },
    sendEvent: function (t, n, i) {
      this.started &&
        $.post("/service", {
          mode: "siteEvent",
          eventName: "ABTestEvent",
          ABTestTitle: e,
          variantTitle: this.currentVariant,
          eventTitle: t,
          eventSeqNum: n,
          customSegment: i ? "AC" : null,
        });
    },
  };
}
$("[data-timeago]").each(function () {
  var e = new Date($(this).data("timeago"));
  $(this).text(TimeAgo.inWords(e.getTime()));
}),
  $("[data-timeago-articles]").each(function () {
    var e = new Date($(this).data("timeago-articles"));
    $(this).text(TimeAgo.inWords(e.getTime(), !0));
  }),
  window.pageReady0 && window.pageReady0(),
  window.pageReady && window.pageReady(),
  window.pageReady1 && window.pageReady1(),
  window.pageReady2 && window.pageReady2(),
  window.pageReady3 && window.pageReady3(),
  window.pageReady4 && window.pageReady4(),
  window.pageReadyFN.forEach(function (e) {
    e();
  }),
  setTimeout(function () {
    cpTrackS("t60");
  }, 6e4),
  $(".js_signup").on("click", sbtnClick),
  $(".__cp_b").on("click", function (e) {
    var t = $(this).data("type"),
      n = $(this).data("demomode");
    t && n && (t += "_demo");
    try {
      dataLayer.push({
        event: "siteEvent",
        eventCategory: "banner",
        eventAction: "click_" + t,
      });
    } catch (e) {}
    $.post("/service", { mode: "banner", action: "click", type: t }),
      $(this).hasClass("__cp_bs") && sbtnClick(e, t, n);
  }),
  $(".js_signup_new").on("click", function (e) {
    e.preventDefault();
    var t = $(this).attr("href"),
      n = "new_" + $(this).data("type");
    cpTrackS(n);
    var i = function () {
      $("#s_overlay_exit").length
        ? (t && "#" != t && $(".js-setHref").attr("href", t),
          $("#s_overlay_exit").removeClass("hidden"))
        : (document.location.href = t || "/trading/signup");
    };
    logged
      ? i()
      : cookieGet("__cp_uid")
      ? loginShow("", { exitFn: i })
      : signupShow(n, i);
  }),
  setTimeout(function () {
    $(".js_signup").off().on("click", sbtnClick);
  }, 300),
  $("#wg_loginBtn").on("click", function (e) {
    loginShow(), e.preventDefault();
  });
var testSample = ABTest("testSample", {
  variant0: function () {
    window.ABVar = 0;
  },
  variant1: function () {
    window.ABVar = 1;
  },
  variant2: function () {
    window.ABVar = 2;
  },
});
testSample.run(),
  $(document).on("cp:signupClick", function (e, t) {
    testSample.sendEvent("click", 1);
  }),
  $(document).on("cp:accountCreated", function (e, t) {
    testSample.sendEvent(
      "ac_" + ("bttn_header" == t.type ? "head" : "other"),
      2,
      !0
    );
  }),
  "CYSEC" == license && logged && testSample.sendEvent("CYSEC", 3),
  (loginAction = function (e, t) {
    if ("signup" == e) signupShow();
    else if ("forgot" == e) forgotShow(t || "");
    else if ("logged" == e) {
      var n = "" + window.location.href;
      n.indexOf("go=deposit") > 0 ||
      n.indexOf("go=status") > 0 ||
      n.indexOf("go=withdraw") > 0 ||
      n.indexOf("go=nci") > 0 ||
      loginCallback
        ? (runUserPanel(),
          loginCallback && loginCallback(),
          window.firebaseLogin && window.firebaseLogin())
        : n.indexOf("go=forgot") > 0
        ? forgotShow()
        : (document.location.href = "/trading/platform/");
    } else "logged_code" == e && runUserPanel();
  }),
  (forgotAction = function (e, t) {
    loginShow(t || "");
  }),
  $(
    ".dBtn,.js-dBtn,.sprite-appstore,.badge-appstore,.badge-googleplay,.sprite-googleplay,.sprite-appstore-w,.sprite-googleplay-w,.store-google,.store-apple"
  ).on("click", function (e) {
    e.preventDefault();
    var t = $(this).hasClass("im") ? "im" : "cp";
    $(this).hasClass("sprite-appstore") ||
    $(this).hasClass("sprite-appstore-w") ||
    $(this).hasClass("store-apple") ||
    $(this).hasClass("badge-appstore")
      ? cpTrackS(t + "IStore")
      : $(this).hasClass("dBtn")
      ? cpTrackS(t + "Download")
      : ($(this).hasClass("sprite-sprite-googleplay") ||
          $(this).hasClass("sprite-sprite-googleplay-w") ||
          $(this).hasClass("store-google") ||
          $(this).hasClass("badge-googleplay")) &&
        cpTrackS(t + "AStore");
    var n = $(this).data("type");
    n && sendGAEvent("banner", "click_" + n),
      setTimeout(function () {
        document.location.href = e.currentTarget.href
          ? e.currentTarget.href
          : $(e.currentTarget).parent().attr("href");
      }, 200);
  });
var langPP = $(".js-langspp");
function cpTrackS(e) {
  var t,
    n,
    i = {
      imIStore: ["store_investmate", "store_investmate_ios"],
      imAStore: ["store_investmate", "store_investmate_android"],
      cpIStore: ["store_capital", "store_capital_ios"],
      cpAStore: ["store_capital", "store_capital_android"],
      cpDownload: ["store_capital", "store_capital_download"],
      imEmail: ["send_link", "send_link_investmate_email"],
      imPhone: ["send_link", "send_link_investmate_phone"],
      cpPhone: ["send_link", "send_link_capital_phone"],
      cpEmail: ["send_link", "send_link_capital_email"],
      t30: ["time_on_page", "30sec"],
      t60: ["time_on_page", "60sec"],
      end: ["page_visibility", "content_end"],
      at_ln: ["share_button", "linkedin"],
      at_fb: ["share_button", "facebook"],
      at_tw: ["share_button", "twitter"],
      s_why: ["signup_button", "whycapital"],
      s_ft: ["signup_button", "footer"],
      bttn_header: ["signup_button", "bttn_header"],
      s_head: ["signup_button", "bttn_header"],
      s_head_p: ["signup_button", "header_platform"],
      s_o: ["signup_button", "other"],
      sb_c: ["smart_banner", "smart_banner_close"],
      sb_s: ["smart_banner", "smart_banner_store"],
    };
  i[e] ? ((t = i[e][0]), (n = i[e][1])) : ((t = "signup_button"), (n = e)),
    -1 == $.inArray(e, ["t30", "t60", "end"]) && (n = "click_" + n);
  try {
    dataLayer.push({ event: "siteEvent", eventCategory: t, eventAction: n });
  } catch (e) {}
}
function accordion() {
  var e = $(".commodities__list"),
    t = $(".tool__more");
  e.removeClass("open"),
    t.on("click", function () {
      $(this).toggleClass("arr-top"), $(this).prev().toggleClass("open");
    }),
    $(".commodities__list a").length > 12 && t.show(),
    $(".side-nav--select-mob").on("click", function () {
      $(this).toggleClass("open");
    }),
    window.addEventListener("resize", function () {
      $(".side-nav--select-mob").removeClass("open");
    });
}
if (
  (langPP.on("click", function (e) {
    $(e.target).hasClass("js-langspp") &&
      (langPP.addClass("hidden"),
      $("body").removeClass("disabled-scroll-body"));
  }),
  $(".close-button", langPP).on("click", function () {
    langPP.addClass("hidden"), $("body").removeClass("disabled-scroll-body");
  }),
  $(".js-langbtn").on("click", function () {
    langPP.removeClass("hidden"), $("body").addClass("disabled-scroll-body");
  }),
  (function () {
    var e,
      t,
      n,
      i,
      a = $(".side-nav__wrap"),
      s = $(window).scrollTop(),
      o =
        ($(".footer__fix").outerHeight(),
        function () {
          a.removeClass("fix"), a.closest(".row").removeAttr("style"), (i = !1);
        }),
      r = function () {
        a.closest(".row").css({ display: "flex", "align-items": "stretch" }),
          a.addClass("fix"),
          (i = !0);
      };
    function c() {
      (s = $(window).scrollTop()),
        i ||
          null == a.offset() ||
          ((e = a.offset().top), (t = a.parent().height() - 50), (n = e + t)),
        n <= s ? r() : o();
    }
    if (
      ($(document).width() > 991
        ? window.addEventListener("scroll", c)
        : window.removeEventListener("scroll", c),
      a.length)
    ) {
      var l = function () {
        (t = a.parent().height() - 50), (e = a.offset().top), (n = e + t);
      };
      l(),
        window.addEventListener("resize", function () {
          $(document).width() > 991
            ? (null === t && (l(), r()), window.addEventListener("scroll", c))
            : ((t = null), window.removeEventListener("scroll", c), o());
        });
    }
  })(),
  accordion(),
  window.lozad &&
    lozad(".cplzd", {
      loaded: function (e) {
        var t = e.closest("picture");
        if (t)
          var n = setInterval(function () {
            t.querySelector("img").complete &&
              (t.classList.add("loadCompleted"), clearInterval(n));
          }, 100);
      },
    }).observe(),
  $(".js-modal-link").on("click", function (e) {
    var t = $(this).attr("data-target");
    e.preventDefault(),
      $("#" + t).removeClass("hidden"),
      $("body").addClass("disabled-scroll-body");
  }),
  $(".js-modal-close").on("click", function (e) {
    var t = $(this).parents(".overlay");
    $("body").removeClass("disabled-scroll-body"), t.addClass("hidden");
  }),
  $(document).mouseup(function (e) {
    var t = $(".js-modal");
    t.is(e.target) ||
      0 !== t.has(e.target).length ||
      (t.parents(".overlay").addClass("hidden"),
      $("body").removeClass("disabled-scroll-body"));
  }),
  ("android" == devicePr || "iphone" == devicePr) && !cookieGet("__cp_uid", 1))
) {
  function setCloseCookie(e) {
    var t = new Date();
    t.setTime(t.getTime() + 864e6), cookieSet("__cp_sb_c", e, t.toGMTString());
  }
  var tbWrap = $("#mobTopBanner");
  function showTopBanner() {
    tbWrap.addClass("active");
  }
  function hideTopBanner() {
    tbWrap.removeClass("active");
  }
  var close = cookieGet("__cp_sb_c", 1),
    closeNum = !!close && +close[1],
    showBanner = !1,
    shown = !1;
  function showTopBannerScroll() {
    if (showBanner && !shown) {
      if (
        ((shown = !0),
        "android" == devicePr && showTopBanner(),
        "iphone" == devicePr)
      ) {
        function e() {
          window.innerHeight == $(window).innerHeight()
            ? !tbWrap.hasClass("active") && showTopBanner()
            : tbWrap.hasClass("active") && hideTopBanner();
        }
        setTimeout(e, 500), wnd.on("scroll", e);
      }
    } else
      closeNum &&
        1 != closeNum &&
        10 != closeNum &&
        20 != closeNum &&
        setCloseCookie(closeNum - 1);
  }
  (closeNum && 1 != closeNum && 10 != closeNum && 20 != closeNum) ||
    (showBanner = !0),
    setTimeout(function () {
      wnd.on("scroll", showTopBannerScroll);
    }, 1e3),
    $("#btnCloseTopBanner").on("click", function (e) {
      !closeNum && setCloseCookie(5),
        1 == closeNum && setCloseCookie(15),
        10 == closeNum && setCloseCookie(26),
        20 == closeNum && setCloseCookie(40),
        cpTrackS("sb_c"),
        e.preventDefault(),
        hideTopBanner();
    }),
    $("#btnStoreTopBanner").on("click", function (e) {
      setCloseCookie(closeNum <= 20 ? 26 : 70), cpTrackS("sb_s");
    });
}
function checkTrustLogo() {
  "gb" == uCountry || "ie" == uCountry
    ? $(".deloitte_item").addClass("hidden")
    : $(".deloitte_item").removeClass("hidden");
}
function ccHeader() {
  var e = $(".js-header"),
    t = $(".js-blinger"),
    n = $(".js-burger, .js-searchRef, .js-langSwitch"),
    i = $(".js-navSlide"),
    a = $(".js-navItem"),
    s = $(".js-navCategory"),
    o = $(".js-navSide"),
    r = $(".js-navBack"),
    c = $(".js-headerApps, .js-headerFooter"),
    l = !1,
    d = $(window).width();
  function u() {
    return window.innerWidth - document.documentElement.clientWidth;
  }
  var h = t.css("padding-right");
  (h = parseInt(h)),
    (h += u()),
    $("body").attr({ style: "--disScrollPdRight: " + u() + "px;" }),
    t.attr({ style: "--blingerPaddingRight: " + h + "px;" }),
    n.on("click", function () {
      var t = $(this),
        u = t.data("target");
      if (
        (d <= 1199 && "burger" != u
          ? n.not(".js-burger").not(this).removeClass("active")
          : n.not(this).removeClass("active"),
        t.toggleClass("active"),
        $("body").addClass("scroll__none"),
        a.removeClass("active"),
        t.hasClass("active"))
      )
        e.addClass("active"),
          i.addClass("active"),
          $('[data-target="' + u + '"]').addClass("active"),
          d <= 767
            ? (s.removeClass("active hidden"),
              o.removeClass("active"),
              c.removeClass("hidden"),
              r.removeClass("active"))
            : (o.removeClass("active").first().addClass("active"),
              s.removeClass("active").first().addClass("active")),
          l ||
            ((l = !0),
            sendGAEvent("visible", "scroll_menu_Ios"),
            sendGAEvent("visible", "scroll_menu_Googl"));
      else if (d <= 1199)
        if ("burger" == u)
          e.removeClass("active"),
            i.removeClass("active"),
            $("body").removeClass("scroll__none");
        else {
          var h = $('.js-navItem[data-target="burger"]');
          a.removeClass("active"), h.addClass("active");
        }
      else
        e.removeClass("active"),
          o.removeClass("active"),
          s.removeClass("active"),
          i.removeClass("active"),
          $("body").removeClass("scroll__none");
      headerItemHeight();
    }),
    r.on("click", function () {
      $(this).removeClass("active"),
        s.removeClass("active hidden"),
        o.removeClass("active"),
        c.removeClass("hidden");
    }),
    s.on("click", function () {
      var t = $(this),
        l = t.data("target");
      s.removeClass("active"),
        t.addClass("active"),
        o.removeClass("active"),
        $('[data-nav="' + l + '"]').addClass("active"),
        d <= 767 &&
          (s.not(this).addClass("hidden"),
          c.addClass("hidden"),
          r.addClass("active")),
        t.hasClass("to-form") &&
          (n.removeClass("active"),
          e.removeClass("active"),
          a.removeClass("active"),
          s.removeClass("active hidden"),
          o.removeClass("active"),
          c.removeClass("hidden"),
          i.removeClass("active"),
          $("body").removeClass("scroll__none"));
    }),
    $(window).on("resize", function () {
      var e = $(window).width();
      e <= 767 && d > 768
        ? ((d = e),
          s.removeClass("active hidden"),
          o.removeClass("active"),
          r.removeClass("active"))
        : e > 767 &&
          d <= 768 &&
          ((d = e),
          s.removeClass("hidden"),
          c.removeClass("hidden"),
          $(".js-navSide.active").length ||
            (s.first().addClass("active"), o.first().addClass("active"))),
        headerItemHeight();
    }),
    ccHeaderSearch();
}
function headerItemHeight() {
  var e,
    t,
    n = $(".js-header"),
    i = $(".js-navSlide"),
    a = $(".js-navItem"),
    s = $(".js-navFooter").outerHeight(),
    o = $(window).width(),
    r = $(window).height(),
    c = $(".js-headerOnly").outerHeight(),
    l = $(".js-stickyBar").outerHeight(),
    d = $(".js-headerMobBtns").outerHeight(),
    u = o >= 1200 ? 32 : 0,
    h = r - c - l;
  (t = n.hasClass("cc-header--fca") ? c + l : c),
    (e = o >= 768 ? h - d - s - u : h - d),
    i.attr({ style: "--yPos: " + t + "px; --wrapHeight: " + h + "px;" }),
    a.attr({ style: "--slideHeight: " + e + "px;" });
}
function ccHeaderSearch() {
  var e,
    t,
    n,
    i = $(".js-searchNew"),
    a = $(".js-searchInput"),
    s = $(".js-searchClose"),
    o = $(".js-searchResult");
  a
    .on("focus", function () {
      $(this).closest(i).addClass("focus");
    })
    .on("keyup change", function () {
      e && clearTimeout(e), t && t.abort(), n && n.abort();
      var s = $(a, this).val();
      s.length > 1
        ? (e = setTimeout(function () {
            !(function (e, i) {
              t = $.post("/service", { mode: "search", qry: e }, function (e) {
                i.html(e),
                  (function (e) {
                    var t = [];
                    $("[data-siid]", e).each(function () {
                      t.push($(this).data("siid"));
                    }),
                      (n = $.ajax({
                        url: pURL + "/trading/v1/quoteCurrent",
                        type: "POST",
                        data: JSON.stringify({ instrumentId: t }),
                        dataType: "json",
                        contentType: "application/json; charset=utf-8",
                        success: function (t) {
                          if (t)
                            for (var n in t.quotes) {
                              var i = t.quotes[n],
                                a = $(
                                  "[data-siid='" + i.instrumentId + "']",
                                  e
                                ).data("dg");
                              $(
                                "[data-siid='" + i.instrumentId + "'] > .buy",
                                e
                              ).text(i.ask.toFixed(a)),
                                $(
                                  "[data-siid='" +
                                    i.instrumentId +
                                    "'] > .sell",
                                  e
                                ).text(i.bid.toFixed(a));
                            }
                        },
                      }));
                  })(i);
              });
              try {
                dataLayer.push({
                  event: "searchPageview",
                  searchPageviewUrl:
                    "/searchRes?__cp_q=" + encodeURIComponent(e),
                });
              } catch (e) {}
            })(s, o);
          }, 300))
        : o.html(""),
        s.length > 0 && $(this).closest(i).addClass("active");
    }),
    s.on("click", function () {
      $(this).closest(i).removeClass("active focus"),
        $(this).siblings(a).val("");
    }),
    window.show30SecSingupPopupFlag && show30SecSingupPopup();
}
function initSentimentWidgets() {
  function e(e) {
    if (
      ((this.rangeClass = ".js-sentiment-progressbar-range"),
      (this.buyClass = ".js-sentiment-buy"),
      (this.sellClass = ".js-sentiment-sell"),
      (this.element = e),
      (this.instrumentId = e.getAttribute("data-id") || 0),
      (this.accuracy = e.getAttribute("data-accuracy") || 0),
      (this.data = null),
      (this.buyPercent = 0),
      (this.sellPercent = 0),
      Number.isNaN(this.instrumentId) ||
        Number.isNaN(this.accuracy) ||
        this.instrumentId <= 0)
    )
      throw "Invalid element parameters";
  }
  (e.prototype.init = function () {
    var e = this;
    this.requestData().then(function (t) {
      e.updateData(t),
        Number.isNaN(e.buyPercent) || Number.isNaN(e.sellPercent) || e.draw();
    });
  }),
    (e.prototype.requestData = function () {
      var e = promise();
      return (
        APICall("instrument.sentiment.get", {
          instrumentId: this.instrumentId,
        }).then(function (t) {
          t && t.instrumentSentiment
            ? e.resolve(t.instrumentSentiment)
            : e.reject("Received invalid data");
        }),
        e
      );
    }),
    (e.prototype.updateData = function (e) {
      Number.isNaN(e.buyPercentage) ||
        e.buyPercentage <= 0.001 ||
        ((this.buyPercent = parseFloat(e.buyPercentage.toFixed(this.accuracy))),
        (this.sellPercent = 100 - this.buyPercent));
    }),
    (e.prototype.draw = function () {
      this.drawRange(), this.drawBuy(), this.drawSell(), this.show();
    }),
    (e.prototype.drawRange = function () {
      var e = this.element.querySelector(this.rangeClass);
      e && e.style.setProperty("--rangeWidth", this.buyPercent + "%");
    }),
    (e.prototype.drawBuy = function () {
      var e = this.element.querySelector(this.buyClass);
      e &&
        (e.textContent =
          parseFloat(this.buyPercent.toFixed(this.accuracy)) + " %");
    }),
    (e.prototype.drawSell = function () {
      var e = this.element.querySelector(this.sellClass);
      e &&
        (e.textContent =
          parseFloat(this.sellPercent.toFixed(this.accuracy)) + " %");
    }),
    (e.prototype.show = function () {
      this.element.classList.remove("hidden");
    }),
    Array.from(document.querySelectorAll(".js-sentiment-widget")).forEach(
      function (t) {
        new e(t).init();
      }
    );
}
function getOnResize() {
  if (!allButtons.length) return allButtons;
  for (var e = 0; e < allButtons.length; e++) {
    var t = $('[data-type="' + allButtons[e].data_type + '"]');
    t.length && (allButtons[e].y = getOffset(t[0]));
  }
}
function checkVisible() {
  for (var e = 0; e < allButtons.length; e++) {
    var t = allButtons[e];
    showButtons.filter(function (e) {
      return t.data_type == e.data_type;
    }).length ||
      (window.scrollY <= window.innerHeight
        ? t.y <= window.innerHeight && showButtons.push(t)
        : t.y <= window.scrollY + window.innerHeight && showButtons.push(t));
  }
  for (e = 0; e < showButtons.length; e++) {
    (t = showButtons[e]).send ||
      (n(t),
      (showButtons[e].send = !0),
      (allButtons = allButtons.filter(function (e) {
        return t.data_type != e.data_type;
      })));
  }
  function n(e) {
    try {
      dataLayer.push({
        event: "siteEvent",
        eventCategory: "visible",
        eventAction: "scroll_" + e.data_type,
      });
    } catch (e) {}
  }
}
function getOffset(e) {
  return $(e).offset().top;
}
function getAllSBtns() {
  var e = $(".js_signup, .js-analyticsVisible, .js_signup_new");
  if (!e.length) return allButtons;
  var t = allButtons;
  return (
    e.each(function (e, n) {
      var i = !0;
      if (t.length)
        for (var a = 0; a < allButtons.length; a++)
          if (allButtons[a].data_type == n.dataset.type) {
            (allButtons[a].y = getOffset(n)), (i = !1);
            break;
          }
      i &&
        allButtons.push({
          data_type: n.dataset.type,
          y: getOffset(n),
          send: !1,
        });
    }),
    allButtons
  );
}
ccHeader(),
  $(".js-ratingVal").length &&
    $(".js-ratingVal").each(function () {
      var e = $(this),
        t = e.attr("style");
      switch (
        ((t = t.split(": ").pop()),
        (t = parseFloat(t)),
        e.hasClass("cc-trustpilotRating--full") &&
          e.attr({ style: "--ratingVal: " + Math.round(2 * t) / 2 }),
        !0)
      ) {
        case t <= 1.7:
          e.addClass("cc-trustpilotRating--1");
          break;
        case t <= 2.7 && t >= 1.8:
          e.addClass("cc-trustpilotRating--2");
          break;
        case t <= 3.7 && t >= 2.8:
          e.addClass("cc-trustpilotRating--3");
          break;
        case t <= 4.2 && t >= 3.8:
          e.addClass("cc-trustpilotRating--4");
          break;
        case t >= 4.3:
          e.addClass("cc-trustpilotRating--5");
      }
    }),
  $(window).on("load", function () {
    $(".date-posted, .date").each(function () {
      var e = $(this).text().replace("undefined", "");
      $(this).text(e);
    });
  }),
  $("body").on("click", function () {
    $(".toggleApps, .js-appsDownload").removeClass("active");
  }),
  $(".toggleApps, .js-appsDownload").on("click", function (e) {
    e.stopPropagation(), $(this).toggleClass("active");
  }),
  $("body").on("click", function () {
    $(".js-toggleLicense").removeClass("active");
  }),
  $(".js-toggleLicense").on("click", function (e) {
    e.stopPropagation(), $(this).toggleClass("active");
  }),
  cookieGet("__cp_lc_notice") ||
    $("#license-diff-notice").removeClass("hidden"),
  $("#license-diff-notice-btn").on("click", function (e) {
    e.preventDefault(), $("#license-diff-notice").addClass("hidden");
    var t = new Date();
    t.setTime(t.getTime() + 864e5),
      cookieSet("__cp_lc_notice", 1, t.toGMTString());
  }),
  $(".js-sendEvent").on("click", function () {
    var e = $(this).data("type");
    try {
      dataLayer.push({
        event: "siteEvent",
        eventCategory: "click",
        eventAction: "click_" + e,
      });
    } catch (e) {}
  }),
  $(".js-analyticsClick").on("click", function (e) {
    e.preventDefault();
    var t = $(this).data("type"),
      n = $(this).attr("href");
    if ((sendGAEvent("click_noConversion", "click_" + (t || "unknown")), n)) {
      var i = $(this).attr("target");
      i && "_blank" == i
        ? window.open(n, "_blank")
        : setTimeout(function () {
            window.location.href = n;
          }, 100);
    }
  });
var sunLoaded = !1,
  sunLoad = function () {
    if (sunLoaded) Smooch.open();
    else {
      var e = document.createElement("script");
      (e.type = "text/javascript"),
        (e.src = "/js/vendor/sunshine.js"),
        document.head.appendChild(e),
        (e.onload = function () {
          Smooch.init({ integrationId: "62badaeb0f375000efbb1042" }).then(
            function () {
              Smooch.open(), (sunLoaded = !0);
            },
            function (e) {}
          );
        });
    }
  };
function show30SecSingupPopup() {
  var e = (e = cookieGet("__cp_ac_c")) ? +e : 0;
  if (!cookieGet("__cp_uid") && !logged) {
    (e && 2 != e && 6 != e && 12 != e && 20 != e) ||
      setTimeout(function () {
        logged ||
          (signupShow("showactimeout30"),
          sendGAEvent("showactimeout30", "showactimeout30"));
      }, 3e4),
      e++;
    var t = new Date();
    t.setTime(t.getTime() + 1728e5), cookieSet("__cp_ac_c", e, t.toGMTString());
  }
}
$(".js-runSunShine").on("click", function (e) {
  e.preventDefault(), sunLoad();
});
var runUserPanel,
  panelLogout,
  logged,
  uEm,
  panelIsCanTrade,
  panelAction,
  panelReady;
!(function () {
  var e,
    t = {
      balanceAccount: {},
      margindata: {},
      currencies: {},
      status: {},
      userId: 0,
      role: null,
      userDetails: {},
      hasDepostiDetails: !1,
      menuItems: [],
      locked: !1,
      confirmTCVersion: !1,
      init: function () {
        (e = $("#userPanel")),
          (t.avTowithdrawal = 0),
          (t.panelOverlay = $("#panelOverlay")),
          (t.wdOverlay = $("#wd_overlay")),
          (t.dpOverlay = $("#dp_overlay")),
          (t.lvOverlay = $("#lv_overlay")),
          (t.EVHide = $(".EV_hide")),
          (t.panelWrap = e),
          (t.panelNotif = $("#panelNotif,.alert-badge.status-badge")),
          (t.regFlowWrap = $(".registration-flow", e)),
          (t.balanceWrap = $(".panel-balance", e)),
          (t.balanceOkWrap = $(".balance-ok", e)),
          (t.statusText = $(".status-text", e)),
          (t.emVerify = $(".emVerify", e)),
          (t.balanceNotOkWrap = $(".balance-notok", e)),
          (t.balanceNumbers = {
            balance: $(".balance", $(".balance-ok", e)),
            profit: $(".profit", $(".balance-ok", e)),
            available: $(".available", $(".balance-ok", e)),
            percents: $(".percents", $(".balance-ok", e)),
            wdAmount: $(".available_amount", "#wd_overlay"),
          });
      },
      doLogin: function () {
        this.socket
          .send("introduceClient", {
            sessionToken: getSID(),
            deviceId: deviceId,
            appVersion: appVersion,
          })
          .then(function (e) {
            (this.userId = e.userId), (this.role = e.userRole);
            var n = 0;
            this.socket.send("user.personalDetails.get").then(function (e) {
              this.updateUserDetails(e),
                1 == ++n &&
                  (t.login(), panelReady && panelReady(t.role, t.status));
            });
          })
          .catch(function () {
            this.logout();
          });
      },
      login: function () {
        (this.logged = !0),
          (logged = !0),
          $(".user-login", this.panelWrap).text(uEm),
          $(".user-panel-close", this.panelWrap).on("click", function () {
            t.hide();
          }),
          $(".logout-user", this.panelWrap).on("click", function () {
            t.logout();
          }),
          $(".withdrawalBtn", this.panelWrap).on("click", function () {
            window.stockMode
              ? (t.hide(), $("#s_overlay_exit").removeClass("hidden"))
              : t.openWithdrawal();
          }),
          $(".depositBtn", this.panelWrap).on("click", function () {
            window.stockMode
              ? (t.hide(), $("#s_overlay_exit").removeClass("hidden"))
              : t.openDeposit();
          }),
          $(".nciFormBtn", this.panelWrap).on("click", function () {
            t.openNCIForm();
          }),
          $(".tradingPlatformBtn", this.panelWrap).on("click", function () {
            window.stockMode
              ? (t.hide(), $("#s_overlay_exit").removeClass("hidden"))
              : t.openPlatform();
          }),
          $("a", ".find-more-pp").on("click", function (e) {
            t.openAlert(_ln.p_nci_popup_ttl, _ln.p_nci_popup_txt, {
              ok: { text: _ln.p_a_btn_ok },
            }),
              e.preventDefault();
          }),
          $("#wg_userarea").on("click", function () {
            t.show();
          }),
          this.panelOverlay.on("click", function () {
            t.hide(), $("body").removeClass("disabled-scroll-body");
          }),
          $("#wphWrap").addClass("user-logged"),
          this.checkStatus();
        var e = "" + window.location.href;
        if (e.indexOf("go=deposit") > 0) {
          var n = e.match(new RegExp("status=(approve|decline|pending)"));
          this.openDeposit(n ? n[1] : null);
        }
        e.indexOf("go=withdraw") > 0 &&
          this.balanceAccount.balance &&
          this.balanceAccount.balance >= 1e-4 &&
          t.openWithdrawalForm(),
          e.indexOf("go=nci") > 0 &&
            !$(".account-status", this.panelWrap).hasClass("hidden") &&
            this.openNCIForm(),
          e.indexOf("go=status") > 0 && this.show(),
          $("body").addClass("user-logged");
      },
      logout: function () {
        this.socket.send("auth.logout"),
          (this.logged = !1),
          (logged = !1),
          this.panelOverlay.off("click"),
          $("#wg_userarea").off("click"),
          $("#wphWrap").removeClass("user-logged"),
          $(".user-panel-close", this.panelWrap).off("click"),
          $(".logout-user", this.panelWrap).off("click"),
          $(".withdrawalBtn", this.panelWrap).off("click"),
          this.emVerify.off("click"),
          $(".nciFormBtn", this.panelWrap).off("click"),
          $(".tradingPlatformBtn", this.panelWrap).off("click"),
          $(".depositBtn", this.panelWrap).off("click"),
          $("a", ".find-more-pp").off("click"),
          this.hide(),
          this.socket.disconnect(),
          $(".ss", ".registration-flow").off("click"),
          removeCookieSessionId(),
          (document.cookie =
            "__cp_at=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"),
          $("body").removeClass("user-logged");
      },
      show: function () {
        this.panelOverlay.show(),
          $("body").addClass("disabled-scroll-body"),
          this.panelWrap.addClass("active");
      },
      hide: function () {
        this.panelOverlay.hide(),
          $("body").removeClass("disabled-scroll-body"),
          this.panelWrap.removeClass("active");
      },
      updateUserDetails: function (e) {
        (this.userDetails = e.personalDetails),
          (this.hasDepostiDetails =
            e.personalDetails.firstName &&
            e.personalDetails.lastName &&
            e.personalDetails.address &&
            e.personalDetails.city &&
            e.personalDetails.postcode &&
            e.personalDetails.country);
        (this.status.regFormSubmitted ||
          "VERIFIED" == this.status.userStatus) &&
        { ES: !0, IT: !0, SE: !0, DK: !0 }[e.personalDetails.country] &&
        this.userDetails.nationality &&
        this.userDetails.nciRequired
          ? $(".account-status", this.panelWrap).removeClass("hidden")
          : $(".account-status", this.panelWrap).addClass("hidden");
      },
      checkStatus: function () {
        this.checkForAlert();
      },
      checkForAlert: function () {
        var e = !1;
        this.userDetails.nationality &&
          this.userDetails.nciRequired &&
          (e = !0),
          e
            ? ($(".account-status", this.panelWrap).removeClass("hidden"),
              this.panelNotif.removeClass("hidden"))
            : ($(".account-status", this.panelWrap).addClass("hidden"),
              this.panelNotif.addClass("hidden"));
      },
      openNCIForm: function () {
        var e = $("#nciNationality");
        (this.addItems = { nciOverlay: $("#nci_overlay"), wc_nationality: e }),
          $(
            ".act-ok, .act-continue,.act-skip,.nci-req,.nci-not-nci-reqreq",
            this.addItems.nciOverlay
          ).addClass("hidden");
        var n = this;
        $(".btnClose", this.addItems.nciOverlay)
          .off("click")
          .on("click", function () {
            n.addItems.nciOverlay.addClass("hidden"),
              $("body").removeClass("disabled-scroll-body");
          }),
          $("ul", e)
            .off("click")
            .on("click", this.getChangeCountry("nationality")),
          this.addItems.nciOverlay
            .off("mouseup touchend")
            .on("mouseup touchend", function (t) {
              e.has($(t.target)).length || n.closeCountries("nationality");
            }),
          $(".nci-tabs", this.addItems.nciOverlay)
            .off("click")
            .on("click", function (e) {
              var t = $(e.target),
                a = t.data("type")
                  ? t.data("type")
                  : t.parents("[data-type]").data("type");
              a && n.chooseNCIMethod(a);
            }),
          $("#nciFld").off("focus blur change keyup"),
          (this.addItems.nciControl = fieldControl(
            "nciFld",
            [
              isRequired,
              validateCustom(function (e) {
                var t = !1;
                return (
                  n.addItems.selectedNCIType &&
                    (t = new RegExp(n.addItems.selectedNCIType.regexp).test(e)),
                  t
                );
              }),
            ],
            function () {
              n.nciValidate();
            }
          )),
          this.getCountries()
            .then(function (e) {
              (n.addItems.fullCountriesList = e.map(function (e) {
                return [
                  e,
                  '<li data-code="' +
                    e.code +
                    '"><em class="flag-32 flag-' +
                    e.code.toLowerCase() +
                    ' flag-country"></em><span class="dropdown-custom-new-content"><span class="country-name">' +
                    e.name +
                    '</span><span class="nowrap"><em class="dropdown-custom-new-check"></em></span></span></li>',
                ];
              })),
                n.changeCode("nationality", !0),
                this.addItems.nciOverlay.removeClass("hidden"),
                $("body").addClass("disabled-scroll-body");
            })
            .catch(function () {
              setTimeout(function () {
                t.openNCIForm();
              }, 1e3);
            }),
          $(".act-ok,.act-skip", this.addItems.nciOverlay)
            .off("click")
            .on("click", function () {
              (n.userDetails.nationalClientIdentifierType = "CONCAT"),
                n.socket
                  .send("user.personalDetails.save", {
                    personalDetails: n.userDetails,
                  })
                  .then(function () {
                    n.addItems.nciOverlay.addClass("hidden"),
                      $("body").removeClass("disabled-scroll-body");
                  });
            }),
          $(".act-continue", this.addItems.nciOverlay)
            .off("click")
            .on("click", function () {
              n.addItems.nciControl.valid &&
                ((n.userDetails.nationalClientIdentifierType =
                  n.addItems.selectedNCIType.type),
                (n.userDetails.nationalClientIdentifier =
                  n.addItems.nciControl.value),
                n.socket
                  .send("user.personalDetails.save", {
                    personalDetails: n.userDetails,
                  })
                  .then(function () {
                    n.addItems.nciOverlay.addClass("hidden"),
                      $("body").removeClass("disabled-scroll-body");
                  })
                  .catch(function (e) {
                    $("#nciFld").addClass("error");
                  }));
            }),
          $(".find-more-nci", this.addItems.nciOverlay)
            .off("click")
            .on("click", function () {
              t.openAlert(_ln.p_nci_popup_ttl, _ln.p_nci_popup_txt, {
                ok: { text: _ln.p_a_btn_ok },
              });
            }),
          $("input.filter", e)
            .off("click keyup")
            .on("click", this.getClickFilter("nationality"))
            .on("keyup", function () {
              var e = $(this).val();
              e
                ? n.socket
                    .send("country.find", { text: e, count: 15 })
                    .then(function (t) {
                      var n = !1;
                      if (t.countries && t.countries.length) {
                        n = {};
                        t.countries.forEach(function (e) {
                          n["" + e.code] = !0;
                        });
                      }
                      this.fillCountries("nationality", e, n);
                    })
                    .catch(function () {
                      this.fillCountries("nationality", e);
                    })
                : n.fillCountries("nationality", e);
            });
      },
      getClickFilter: function (e) {
        return function (n) {
          return t.openCountries(e), n.stopPropagation(), !1;
        };
      },
      changeCode: function (e, t) {
        var n = this,
          a = this.addItems.fullCountriesList.filter(function (t) {
            return t[0].code == n.userDetails[e];
          });
        $("input.filter", this.addItems["wc_" + e]).val(a[0][0].name),
          $(".flag-32", $(".country-code", this.addItems["wc_" + e]))
            .removeClass()
            .addClass("flag-32 flag-" + this.userDetails[e].toLowerCase()),
          t &&
            (this.addItems.optionsTM && clearTimeout(this.addItems.optionsTM),
            (this.addItems.optionsTM = setTimeout(function () {
              n.fillNCIOptions(a[0][0]);
            }, 150)));
      },
      fillNCIOptions: function (e) {
        this.socket
          .send("user.personalDetails.nationalClientIdentifierFormat", {
            country: e.code,
          })
          .then(function (t) {
            var n = !1,
              a = [];
            if (
              (t.formats.forEach(function (e) {
                "CONCAT" == e.type ? (n = !0) : a.push(e);
              }),
              n && !a.length)
            )
              $(".nci-req", this.addItems.nciOverlay).addClass("hidden"),
                $(".nci-not-req>strong", this.addItems.nciOverlay).text(
                  _ln.p_nci_not_req.replace("#", e.name)
                ),
                $(".nci-not-req", this.addItems.nciOverlay).removeClass(
                  "hidden"
                ),
                $(".act-continue,.act-skip").addClass("hidden"),
                $(".act-ok").removeClass("hidden"),
                $(".nci-tabs", this.addItems.nciOverlay).addClass("hidden");
            else {
              $(".nci-not-req", this.addItems.nciOverlay).addClass("hidden"),
                $(".act-ok", this.addItems.nciOverlay).addClass("hidden"),
                $(".act-continue", this.addItems.nciOverlay).removeClass(
                  "hidden"
                ),
                1 == a.length
                  ? ($(".nci-tabs", this.addItems.nciOverlay).addClass(
                      "hidden"
                    ),
                    $(".nci-req>strong", this.addItems.nciOverlay).text(
                      _ln.p_nci_ttl_one
                    ))
                  : ($(".nci-tabs", this.addItems.nciOverlay)
                      .html("")
                      .removeClass("hidden"),
                    $(".nci-req>strong", this.addItems.nciOverlay).text(
                      _ln.p_nci_ttl_many
                    )),
                n
                  ? $(".act-skip", this.addItems.nciOverlay).removeClass(
                      "hidden"
                    )
                  : $(".act-skip", this.addItems.nciOverlay).addClass("hidden"),
                $(".nci-req", this.addItems.nciOverlay).removeClass("hidden"),
                (this.addItems.nciTypes = {});
              var i = this;
              a.forEach(function (e) {
                (i.addItems.nciTypes[e.type] = e),
                  $(".nci-tabs", i.addItems.nciOverlay).append(
                    "<li data-type='" + e.type + "'>" + e.name + "</li>"
                  );
              }),
                this.chooseNCIMethod(a[0].type);
            }
          });
      },
      nciValidate: function () {
        return this.addItems.nciControl.valid
          ? ($(".act-continue", this.addItems.nciOverlay).prop("disabled", !1),
            !0)
          : ($(".act-continue", this.addItems.nciOverlay).prop("disabled", !0),
            !1);
      },
      chooseNCIMethod: function (e) {
        this.addItems.selectedNCIType != this.addItems.nciTypes[e] &&
          ((this.addItems.selectedNCIType = this.addItems.nciTypes[e]),
          $(".nci-tabs>.active", this.addItems.nciOverlay).removeClass(
            "active"
          ),
          $(
            ".nci-tabs>[data-type='" + e + "']",
            this.addItems.nciOverlay
          ).addClass("active"),
          $(".nci-fld>label", this.addItems.nciOverlay).html(
            this.addItems.selectedNCIType.name
          ),
          $("#nciFld>input", this.addItems.nciOverlay).attr(
            "placeholder",
            this.addItems.selectedNCIType.pattern
          ),
          $(".nci-hint", this.addItems.nciOverlay).html(
            this.addItems.selectedNCIType.source
          ),
          this.addItems.nciControl.onChange(null, !0),
          (this.addItems.nciControl.displayErrors = !1),
          this.addItems.nciControl.onBlur(),
          this.nciValidate());
      },
      getChangeCountry: function (e) {
        return function (n) {
          var a = $(n.target);
          (a.data("code")
            ? a.data("code")
            : a.parents("[data-code]").data("code")) &&
            (t.changeCode(e, !0), t.closeCountries(e));
        };
      },
      countriesFilterFn0: function (e) {
        return function (t) {
          if (e[t[0].code]) return !0;
        };
      },
      countriesFilterFn1: function (e) {
        return function (t) {
          var n = t[0].name.toLowerCase();
          if (
            0 == t[0].code.toLowerCase().indexOf(e) ||
            0 == n.indexOf(e) ||
            (e.length > 2 && n.indexOf(e) >= 0)
          )
            return !0;
        };
      },
      fillCountries: function (e, t, n) {
        var a = $("ul", this.addItems["wc_" + e]);
        if (t) {
          var i = t.toLowerCase(),
            s = this.addItems.fullCountriesList
              .filter(
                n ? this.countriesFilterFn0(n) : this.countriesFilterFn1(i)
              )
              .map(function (e) {
                return e[1];
              });
          s.length
            ? a
                .html(s.join(""))
                .find(".flag-" + this.userDetails[e].toLowerCase())
                .parent()
                .addClass("check")
            : a.html("<li>" + _ln.rg_3_f_err_code.replace("##", t) + "</li>");
        } else
          a.html(
            this.addItems.fullCountriesList
              .map(function (e) {
                return e[1];
              })
              .join("")
          )
            .find(".flag-" + ("" + this.userDetails[e]).toLowerCase())
            .parent()
            .addClass("check");
      },
      openCountries: function (e) {
        this.fillCountries(e),
          $("ul", this.addItems["wc_" + e]).addClass("open"),
          $("input.filter", this.addItems["wc_" + e])
            .val("")
            .focus();
      },
      closeCountries: function (e) {
        $("ul", this.addItems["wc_" + e]).removeClass("open"),
          this.changeCode(e);
      },
      getCountries: function () {
        var e = promise(this);
        return (
          this.countries
            ? e.resolve(this.countries)
            : this.API("country.getAll", { locale: lnProp || "en" })
                .then(function (t) {
                  (this.countries = t.countries), e.resolve(this.countries);
                })
                .catch(function () {
                  e.reject();
                }),
          e
        );
      },
      openAlert: function (e, n, a) {
        var i = $("#alert_overlay");
        a.nok
          ? $(".act-nok", i)
              .on("click", function () {
                t.closeAlert(), a.nok.callback && a.nok.callback();
              })
              .text(a.nok.text)
              .removeClass("hidden")
          : $(".act-nok", i).addClass("hidden"),
          a.ok
            ? $(".act-ok", i)
                .on("click", function () {
                  t.closeAlert(), a.ok.callback && a.ok.callback();
                })
                .text(a.ok.text)
                .removeClass("hidden")
            : $(".act-ok", i).addClass("hidden"),
          a.iconAlert
            ? $(".nci-warning-icon", i).removeClass("hidden")
            : $(".nci-warning-icon", i).addClass("hidden"),
          $(".alert_ttl", i).text(e),
          $(".alert_txt", i).html(n),
          i.removeClass("hidden"),
          $("body").addClass("disabled-scroll-body");
      },
      closeAlert: function () {
        var e = $("#alert_overlay");
        e.addClass("hidden"),
          $("body").removeClass("disabled-scroll-body"),
          $(".act-nok", e).off("click"),
          $(".act-ok", e).off("click");
      },
      updatePersonalDetails: function (e) {
        this.updateUserDetails(e), this.checkStatus();
      },
      unauthorize: function (e) {
        this.logout();
      },
      openPlatform: function () {
        document.location.href = "/trading/platform/";
      },
      openDeposit: function () {
        document.location.href = "/trading/platform/?popup=deposit&step=select";
      },
      openWithdrawal: function () {
        document.location.href =
          "/trading/platform/?popup=withdraw&step=select";
      },
      API: function (e, n) {
        var a = promise(t);
        return (
          APICall(e, n)
            .then(function (e) {
              a.resolve(e);
            })
            .catch(function (e) {
              a.reject(e);
            }),
          a
        );
      },
      APIPayment: function (e, n, a) {
        var i = promise(t);
        return (
          APIPaymentCall(e, n, a)
            .then(function (e) {
              i.resolve(e);
            })
            .catch(function (e) {
              i.reject(e);
            }),
          i
        );
      },
    };
  (t.socket = initSocket(t)),
    t.socket.setReconnectFn(function () {
      t.doLogin();
    }),
    (runUserPanel = function () {
      $("#l_overlay").length
        ? (t.init(),
          t.socket.connect().then(function () {
            this.doLogin();
          }))
        : $.get("?t=get_template", { ln: lnProp || "en" }, function (e) {
            $("body").append(e), runUserPanel();
          });
    }),
    (panelIsCanTrade = function (e) {
      return !1;
    }),
    (panelLogout = function () {
      return t.logout();
    }),
    (panelAction = function (e, n) {
      return "getStatus" == e
        ? { role: t.role, status: t.status }
        : t.socket.send(e, n);
    });
})();
var loc = "" + window.location.href;
if (logged) runUserPanel();
else if (
  loc.indexOf("go=deposit") > 0 ||
  loc.indexOf("go=status") > 0 ||
  loc.indexOf("go=login") > 0 ||
  loc.indexOf("go=withdraw") > 0 ||
  loc.indexOf("go=nci") > 0
)
  loginShow("", {
    ac:
      loc.indexOf("go=login") > 0 &&
      (code = loc.match(new RegExp("(^|&)t=([-a-zA-Z0-9]+)($|&)")))
        ? code[2]
        : null,
  });
else if (loc.indexOf("go=forgot") > 0) forgotShow();
else {
  var c;
  (c = ("" + document.cookie).match(
    new RegExp("(^| )__cp_at=([-a-zA-Z0-9]+)")
  )) && loginShow("", { at: c[2] });
}
$(window).on("click", function (e) {
  if (e.target.closest(".js-fieldDropdown")) {
    var o = e.target.closest(".js-fieldDropdown"),
      s = $(o).find(".fieldDropdown__control").attr("placeholder");
    if (
      ($(".js-fieldDropdown.opened").length > 0 &&
        !$(o).hasClass("opened") &&
        $(".js-fieldDropdown.opened").removeClass("opened"),
      $(o).toggleClass("opened"),
      !$(o).hasClass("opened") && $(e.target).is("li"))
    ) {
      var d = $(e.target).text() || s;
      $(o).find(".fieldDropdown__control").attr("placeholder", d);
    }
  } else $(".js-fieldDropdown.opened").length > 0 && $(".js-fieldDropdown.opened").removeClass("opened");
  if (
    e.target.closest(".js-fieldDropdownSearch") &&
    !e.target.closest(".js-fieldDropdownSearchClose")
  ) {
    o = e.target.closest(".js-fieldDropdownSearch");
    $(o).hasClass("focused") || $(o).addClass("focused");
  } else $(".js-fieldDropdownSearch.focused").length > 0 && ($(".js-fieldDropdownSearch.focused").removeClass("opened focused"), $(".js-fieldDropdownSearch .fieldDropdown__control").val(""));
}),
  $(".js-fieldDropdownSearch").length > 0 &&
    ($(".js-fieldDropdownSearch").on("keyup", function () {
      $(this).find(".fieldDropdown__control").val().length > 0 &&
        $(this).addClass("opened");
    }),
    $(".js-fieldDropdownSearchClose").on("click", function () {
      var e = $(this);
      e.closest(".js-fieldDropdownSearch").removeClass("opened focused"),
        e.siblings(".fieldDropdown__control").val("");
    })),
  $(".js-tabs [data-tab-control]").on("click", function () {
    var e = $(this),
      o = e.closest(".js-tabs"),
      s = e.attr("data-tab-control");
    e.addClass("active").siblings().removeClass("active"),
      o
        .find("[data-tab-content]")
        .not(o.find("[data-tab-content] [data-tab-content]"))
        .removeClass("active")
        .filter("[data-tab-content=" + s + "]")
        .addClass("active");
  });
