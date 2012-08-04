/*
 /*
 Copyright (c) 2011 Shyc2001 (http://twitter.com/shyc2001)
 This work is based on:
 *"Switchy! Chrome Proxy Manager and Switcher" (by Mohammad Hejazi (mohammadhi at gmail d0t com))
 *"SwitchyPlus" by @ayanamist (http://twitter.com/ayanamist)

 This file is part of SwitchySharp.
 SwitchySharp is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 SwitchySharp is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with SwitchySharp.  If not, see <http://www.gnu.org/licenses/>.
 */
var extension;
//var ProfileManager;
//var Settings;
//var Logger;
//var Utils;
//var I18n;
var anyValueModified = false;
var ignoreFieldsChanges = false;
var selectedRow;

function init() {
    extension = chrome.extension.getBackgroundPage();
    ProfileManager = extension.ProfileManager;
    Settings = extension.Settings;
    Logger = extension.Logger;
    Utils = extension.Utils;
    I18n = extension.I18n;
    ProxyPlugin = extension.ProxyPlugin;

    I18n.process(document);
    document.body.style.visibility = "visible";

    initUI();
    loadOptions();
    checkPageParams();

    HelpToolTip.enableTooltips();
}

function initUI() {
    // Tab Control
    $("#tabsContainer div").click(function () {
        $("#tabsContainer div").removeClass("selected").addClass("normal");
        $(this).removeClass("normal").addClass("selected");
        $("#body .tab").hide();
        $("#" + $(this).attr("id") + "Body").show();
        if (this.id == "tabImportExport")
            $(".control").hide();
        else
            $(".control").show();
    });

    // Proxy Profiles
    $("#profileName").bind("keyup change", function () {
        $("td:first", selectedRow).text($(this).val()); // sync profile title changes
        selectedRow[0].profile.name = $(this).val();
        onFieldModified(true);
    });
    $("#modeManual").change(function () {
        if ($("#modeManual").is(":checked")) {
            selectedRow[0].profile.proxyMode = ProfileManager.ProxyModes.manual;
            $("#httpRow, #sameProxyRow, #httpsRow, #ftpRow, #socksRow, #socksVersionRow").removeClass("disabled");
            $("#httpRow input, #sameProxyRow input, #httpsRow input, #ftpRow input, #socksRow input, #socksVersionRow input").removeAttr("disabled");
            $("#configUrlRow").addClass("disabled");
            $("#configUrlRow input").attr("disabled", "disabled");
            $("#useSameProxy").change();
        }
        onFieldModified(true);
    });
    $("#httpProxyHost, #httpProxyPort").change(function () {
        selectedRow[0].profile.proxyHttp = joinProxy($("#httpProxyHost").val(), $("#httpProxyPort").val(), 80);
        onFieldModified(true);
    });
    $("#useSameProxy").change(function () {
        if ($(this).is(":checked")) {
            selectedRow[0].profile.useSameProxy = true;
            $("#httpsRow, #ftpRow, #socksRow, #socksVersionRow").hide();
//			$("#httpsRow, #ftpRow, #socksRow, #socksVersionRow").addClass("disabled");
//			$("#httpsRow input, #ftpRow input, #socksRow input, #socksVersionRow input").attr("disabled", "disabled");
        } else {
            selectedRow[0].profile.useSameProxy = false;
            $("#httpsRow, #ftpRow, #socksRow, #socksVersionRow").show();
//			$("#httpsRow, #ftpRow, #socksRow, #socksVersionRow").removeClass("disabled");
//			$("#httpsRow input, #ftpRow input, #socksRow input, #socksVersionRow input").removeAttr("disabled");
        }
        onFieldModified(true);
    });
    $("#httpsProxyHost, #httpsProxyPort").change(function () {
        selectedRow[0].profile.proxyHttps = joinProxy($("#httpsProxyHost").val(), $("#httpsProxyPort").val(), 443);
        onFieldModified(true);
    });
    $("#ftpProxyHost, #ftpProxyPort").change(function () {
        selectedRow[0].profile.proxyFtp = joinProxy($("#ftpProxyHost").val(), $("#ftpProxyPort").val(), 21);
        onFieldModified(true);
    });
    $("#socksProxyHost, #socksProxyPort").change(function () {
        selectedRow[0].profile.proxySocks = joinProxy($("#socksProxyHost").val(), $("#socksProxyPort").val(), 80);
        onFieldModified(true);
    });
    $("#socksV4, #socksV5").change(function () {
        selectedRow[0].profile.socksVersion = $("#socksV5").is(":checked") ? 5 : 4;
        onFieldModified(true);
    });
    $("#proxyExceptions").change(function () {
        selectedRow[0].profile.proxyExceptions = $(this).val();
        onFieldModified(true);
    });
    $("#proxyConfigUrl").change(function () {
        selectedRow[0].profile.proxyConfigUrl = $(this).val();
        onFieldModified(true);
    });

    // Network
    $("#chkMonitorProxyChanges").change(function () {
        if ($(this).is(":checked"))
            $("#chkPreventProxyChanges").removeAttr("disabled").parent().removeClass("disabled");
        else
            $("#chkPreventProxyChanges").attr("disabled", "disabled").parent().addClass("disabled");
    });

    $("#chkMonitorProxyChanges, #chkPreventProxyChanges").change(function () {
        onFieldModified(false);
    });

    // Import-Export
    $("#txtBackupFilePath").bind("click keydown", function () {
        if ($(this).hasClass("initial"))
            $(this).removeClass("initial").val("");
    });

    // General
    $("#chkQuickSwitch").change(function () {
        if ($(this).is(":checked")) {
            $("#quickSwitchDiv ul").removeClass("disabled").sortable("enable");
        } else {
            $("#quickSwitchDiv ul").addClass("disabled").sortable("disable");
        }
        onFieldModified(false);
    });
    $("#quickSwitchDiv ul").sortable({
        connectWith:"#quickSwitchDiv ul",
        change:function () {
            onFieldModified(false);
        }
    }).disableSelection();


    $("#cmbStartupProfile").change(function () {
        onFieldModified(false);
    });

    $("#chkConfirmDeletion, #chkRefreshTab").change(function () {
        onFieldModified(false);
    });

    // Reverse buttons order on Linux and Mac OS X
    if (!Utils.OS.isWindows) {
        var btnSaveContainer = $("#btnSave").parent();
        btnSaveContainer.next().next().insertBefore(btnSaveContainer);
        btnSaveContainer.next().insertBefore(btnSaveContainer);
    }
}

function loadOptions() {
    // Proxy Profiles
    ignoreFieldsChanges = true;
    $("#proxyProfiles .tableRow").remove();
    ProfileManager.loadProfiles();
    var profiles = ProfileManager.getSortedProfileArray();
    var profilesTemp = ProfileManager.getProfiles();
    var currentProfile = ProfileManager.getCurrentProfile();
    var lastSelectedProfile = selectedRow;
    selectedRow = undefined;
    var i, profile, row;
    for (i in profiles) {
        if (profiles.hasOwnProperty(i)) {
            profile = profiles[i];
            if (!profile.id || profile.id.length == 0 || profile.id == "unknown") {
                generateProfileId(profilesTemp, profile);
                profilesTemp[profile.id] = profile;
            }

            row = newRow(profile);

            if (lastSelectedProfile && profile.id == lastSelectedProfile[0].profile.id)
                $("td:first", row).click(); // selects updated profile
        }
    }

    if (currentProfile.unknown) {
        if (currentProfile.proxyMode != ProfileManager.ProxyModes.direct) {
            currentProfile.name = ProfileManager.currentProfileName;
            row = newRow(currentProfile);
        }
    } else if (profiles.length == 0) {
        row = newRow(undefined);
        if (!selectedRow)
            $("td:first", row).click();
    }

    if (!selectedRow)
        $("#proxyProfiles .tableRow td:first").click();

    // Network
    if (Settings.getValue("monitorProxyChanges", true))
        $("#chkMonitorProxyChanges").attr("checked", "checked");
    if (Settings.getValue("preventProxyChanges", false))
        $("#chkPreventProxyChanges").attr("checked", "checked");

    $("#chkMonitorProxyChanges").change();
    $("#chkPreventProxyChanges").change();

    // General
    if (Settings.getValue("quickSwitch", false))
        $("#chkQuickSwitch").attr("checked", "checked");

    $("#chkQuickSwitch").change();

    $("#cycleEnabled, #cycleDisabled, #cmbStartupProfile").empty();
    var directProfile = ProfileManager.directConnectionProfile;
    var systemProfile = ProfileManager.systemProxyProfile;
    profiles.unshift(directProfile);

    var ps = new Array();

    $.each(profiles, function (key, profile) {
        var ii = $("<option>").attr("value", profile.id).text(profile.name);
        var item = ii.clone();
        item[0].profile = profile;

        ps[profile.id] = profile;
    });

    ps[systemProfile.id] = systemProfile;

    var startupProfileId = Settings.getValue("startupProfileId", "");

    var item = $("<option>").attr("value", "").text(I18n.getMessage("options_lastSelectedProfile"));
    item[0].profile = { id:"" };
    $("#cmbStartupProfile").append(item);

    for (i in ps) {
        if (ps.hasOwnProperty(i)) {
            profile = ps[i];
            ii = $("<option>").attr("value", profile.id).text(profile.name);
            ii[0].profile = profile;

            if (startupProfileId == profile.id)
                ii.attr("selected", "selected");
            $("#cmbStartupProfile").append(ii);
        }
    }

    var cycleEnabled = $("#cycleEnabled");
    var cycleDisabled = $("#cycleDisabled");
    var QSP = Settings.getObject("quickSwitchProfiles") || [];

    $.each(QSP, function (key, pid) {
        var profile = ps[pid];
        if (profile == undefined) return;
        var ii = $("<li>").text(profile.name).append($("<div>").addClass(profile.color));
        ii[0].profile = profile;
        cycleEnabled.append(ii);
        ps[profile.id] = undefined;
    });
    for (i in ps) {
        if (ps.hasOwnProperty(i)) {
            profile = ps[i];
            if (profile == undefined) continue;
            var ii = $("<li>").text(profile.name).append($("<div>").addClass(profile.color));
            ii[0].profile = profile;
            cycleDisabled.append(ii);
        }
    }

    $("#quickSwitchDiv ul").sortable("refresh");


    if (Settings.getValue("confirmDeletion", true))
        $("#chkConfirmDeletion").attr("checked", "checked");
    if (Settings.getValue("refreshTab", false))
        $("#chkRefreshTab").attr("checked", "checked");

    $("#chkConfirmDeletion").change();
    $("#chkRefreshTab").change();

    $("#lastListUpdate").text(Settings.getValue("lastListUpdate", "Never"));

    // Done
    ignoreFieldsChanges = false;
    anyValueModified = false;
}

function saveOptions() {
    // Proxy Profiles
    var currentProfile = ProfileManager.getCurrentProfile();
    var oldProfiles = ProfileManager.getProfiles();
    var profiles = {};
    var rows = $("#proxyProfiles .tableRow");
    var i, row, profile;
    for (i = 0; i < rows.length; i++) {
        row = rows[i];
        profile = row.profile;
        if (profile.unknown != undefined) // don't save unknown profiles
            continue;

        profile.proxyHttp = fixProxyString(profile.proxyHttp, "80");
        profile.proxyHttps = fixProxyString(profile.proxyHttps, "443");
        profile.proxyFtp = fixProxyString(profile.proxyFtp, "21");
        profile.proxySocks = fixProxyString(profile.proxySocks, "80");

        if (profile.proxyHttp == profile.proxyHttps
            && profile.proxyHttps == profile.proxyFtp
            && profile.proxyFtp == profile.proxySocks)
            profile.useSameProxy = true;

        if (!profile.id || profile.id.length == 0 || profile.id == "unknown") {
            generateProfileId(oldProfiles, profile);
            oldProfiles[profile.id] = profile; // just for not choosing the same id again.
        }

        profiles[profile.id] = profile;

        if (profile.name == currentProfile.name) // reapply current profile (in case it's changed)
            ProfileManager.applyProfile(profile);
    }

    ProfileManager.setProfiles(profiles);
    ProfileManager.save();

    // Network
    Settings.setValue("monitorProxyChanges", ($("#chkMonitorProxyChanges").is(":checked")));
    Settings.setValue("preventProxyChanges", ($("#chkPreventProxyChanges").is(":checked")));

    // General
    Settings.setValue("quickSwitch", ($("#chkQuickSwitch").is(":checked")));

    var QSP = new Array();
    $("#cycleEnabled li").each(function (i, n) {
        QSP.push(n.profile.id);
    });
    Settings.setObject("quickSwitchProfiles", QSP);

    Settings.setValue("startupProfileId", $("#cmbStartupProfile option:selected")[0].profile.id);

    Settings.setValue("confirmDeletion", ($("#chkConfirmDeletion").is(":checked")));
    Settings.setValue("refreshTab", ($("#chkRefreshTab").is(":checked")));

    extension.setIconInfo();
    InfoTip.showMessageI18n("message_optionsSaved", InfoTip.types.success);
    loadOptions();
    anyValueModified = false;
}

function closeWindow() {
    if (anyValueModified && InfoTip.confirmI18n("message_saveChangedValues"))
        saveOptions();

    window.close();
}

function switchTab(tab) {
    var tabId;
    switch (tab) {
        case "network":
            tabId = "tabNetwork";
            break;

        case "importexport":
            tabId = "tabImportExport";
            break;

        case "general":
            tabId = "tabGeneral";
            break;

        default:
            tabId = "tabProfiles";
            break;
    }
    $("#" + tabId).click();
}

function resetOptions() {
    if (!confirm("\nThis will delete all your options permanently, continue?"))
        return;

    if (!confirm("\nAre you sure you want to delete all your options permanently?"))
        return;

    extension.localStorage.clear();
    Settings.refreshCache();
    alert("\nOptions reset successfully..");
    loadOptions();
    anyValueModified = false;
}

function onFieldModified(isChangeInProfile) {
    if (ignoreFieldsChanges) // ignore changes when they're really not changes (populating fields)
        return;

    if (isChangeInProfile && selectedRow != undefined) {
        delete selectedRow[0].profile.unknown; // so it can be saved (when clicking Save)
        selectedRow.removeClass("unknown");
    }
    anyValueModified = true;
}

function generateProfileId(profiles, profile) {
    var profileId = profile.name;
    if (profiles[profileId] != undefined || profileId == ProfileManager.directConnectionProfile.id) {
        for (var j = 2; ; j++) {
            var newId = profileId + j;
            if (profiles[newId] == undefined) {
                profileId = newId;
                break;
            }
        }
    }
    profile.id = profileId;
}

function newRow(profile) {
    var table = $("#proxyProfiles");
    var row = $("#proxyProfiles .templateRow").clone();
    row.removeClass("templateRow").addClass("tableRow");
    table.append(row);

    $("td:first", row).click(onSelectRow);

    if (profile) {
        profile = ProfileManager.normalizeProfile(profile);
        $("td:first", row).text(profile.name);
        $("td:nth(1) div div", row).addClass(profile.color);
//		$("td:nth(0)", row).addClass("c" + profile.color);
        row[0].profile = profile;
        if (profile.unknown)
            row.addClass("unknown");

    } else {
        var profileName = $("#proxyProfiles .templateRow td:first").text(); // template name
        row[0].profile = {
            name:profileName,
            proxyMode:ProfileManager.ProxyModes.manual,
            proxyHttp:"",
            useSameProxy:false,
            proxyHttps:"",
            proxyFtp:"",
            proxySocks:"",
            socksVersion:4,
            proxyExceptions:"localhost; 127.0.0.1; <local>",
            proxyConfigUrl:""
        };

        $("td:first", row).click();
        $("td:nth(1) div div", row).addClass("blue");
        $("#profileName").focus().select();
    }
    return row;
}

function deleteRow() {
    var row = event.target.parentNode.parentNode;
    if (!Settings.getValue("confirmDeletion", true)
        || InfoTip.confirmI18n("message_deleteSelectedProfile", row.children[0].innerText)) {

        if (selectedRow != undefined && selectedRow[0] == row)
            onSelectRow({}); // to clear fields.

        $(row).remove();

        saveOptions();
        loadOptions();
        extension.setIconInfo();
        InfoTip.showMessageI18n("message_profileDeleted", InfoTip.types.info);
    }
}

function changeColor() {
    var target = event.target.onclick ? event.target.children[0] : event.target;
    var cell = $(target);
    var profile = target.parentNode.parentNode.parentNode.profile;
    var color;

    if (cell.attr("class") == "" || cell.hasClass("blue"))
        color = "green";
    else if (cell.hasClass("green"))
        color = "red";
    else if (cell.hasClass("red"))
        color = "yellow";
    else if (cell.hasClass("yellow"))
        color = "purple";
    else if (cell.hasClass("purple"))
        color = "blue";

    cell.attr("class", color);
    profile.color = color;
}

function onSelectRow(e) {
    var profile;
    if (e.target) { // fired on event?
        var row = $(this).parent();
        if (selectedRow)
            selectedRow.removeClass("selected");

        row.addClass("selected");
        selectedRow = row;

        profile = row[0].profile;

    } else { // or by calling
        profile = e;
    }

    ignoreFieldsChanges = true;
    var proxyInfo;
    $("#profileName").val(profile.name || "");

    proxyInfo = parseProxy(profile.proxyHttp || "", 80);
    $("#httpProxyHost").val(proxyInfo.host);
    $("#httpProxyPort").val(proxyInfo.port);

    if (profile.useSameProxy) {
        $("#useSameProxy").attr("checked", "checked");
    }
    else {
        $("#useSameProxy").removeAttr("checked");
    }
    $("#useSameProxy").change();

    if (profile.proxyMode == ProfileManager.ProxyModes.manual) {
        $("#modeManual").attr("checked", "checked");
        $("#modeAuto").removeAttr("checked");
    }
    else {
        $("#modeManual").removeAttr("checked");
        $("#modeAuto").attr("checked", "checked");
    }
    $("#modeManual").change();

    proxyInfo = parseProxy(profile.proxyHttps || "", 443);
    $("#httpsProxyHost").val(proxyInfo.host);
    $("#httpsProxyPort").val(proxyInfo.port);

    proxyInfo = parseProxy(profile.proxyFtp || "", 21);
    $("#ftpProxyHost").val(proxyInfo.host);
    $("#ftpProxyPort").val(proxyInfo.port);

    proxyInfo = parseProxy(profile.proxySocks || "", 80);
    $("#socksProxyHost").val(proxyInfo.host);
    $("#socksProxyPort").val(proxyInfo.port);

    if (profile.socksVersion == 5)
        $("#socksV5").attr("checked", "checked");
    else
        $("#socksV4").attr("checked", "checked");

    $("#proxyExceptions").val(profile.proxyExceptions || "");

    $("#proxyConfigUrl").val(profile.proxyConfigUrl || "");

    $("#profileName").focus().select();

    ignoreFieldsChanges = false;
}

function saveFileAs(fileName, fileData) {
    try {
        var bb = null;
        if (typeof(BlobBuilder) == 'undefined')
            bb = new window.WebKitBlobBuilder();
        else
            bb = new BlobBuilder();
        bb.append(fileData);
        saveAs(bb.getBlob('text/plain'), fileName);
    } catch (e) {
        Logger.log("Oops! Can't save generated file, " + e.toString(), Logger.Types.error);
        InfoTip.alertI18n("message_cannotSaveFile");
    }
}

function makeBackup() {
    var options = {};
    for (var optionName in localStorage) {
        if (localStorage.hasOwnProperty(optionName)) {
            options[optionName] = localStorage[optionName];
        }
    }

    var backupData = $.base64Encode(JSON.stringify(options));

    saveFileAs("SwitchyOptions.bak", backupData);
}

function restoreBackup() {
    var txtBackupFilePath = $("#txtBackupFilePath");
    if (txtBackupFilePath.hasClass("initial") || txtBackupFilePath.val().trim().length == 0) {
        InfoTip.alertI18n("message_selectBackupFile");
        txtBackupFilePath.focus();
        return;
    }
    var backupFilePath = txtBackupFilePath.val();
    var backupData = undefined;

    $.ajax({
        async:false,
        url:backupFilePath,
        success:function (data) {
            if (data.length <= 1024 * 50) // bigger than 50 KB
                backupData = data;
            else
                Logger.log("Too big backup file!", Logger.Types.error);
        },
        error:function () {
            Logger.log("Error downloading the backup file!", Logger.Types.warning);
        },
        dataType:"text",
        cache:false,
        timeout:10000
    });

    restoreBase64Json(backupData);
}
function restoreLocal() {
    var rfile = $("#rfile")[0];
    if (rfile.files.length > 0 && rfile.files[0].name.length > 0) {
        var r = new FileReader();
        r.onload = function (e) {
            restoreBase64Json(e.target.result);
        };
        r.onerror = function () {
            InfoTip.alertI18n("message_cannotReadOptionsBackup");
        };
        r.readAsText(rfile.files[0]);
        rfile.value = "";
    }
}
function importPAC() {
    var pfile = $("#pfile")[0];
    if (pfile.files.length > 0 && pfile.files[0].name.length > 0) {
        var r = new FileReader();
        r.onload = function (e) {
            $("#proxyConfigUrl").val(selectedRow[0].profile.proxyConfigUrl = e.target.result);
            onFieldModified(true);
        };
        r.onerror = function () {
            InfoTip.alertI18n("message_cannotReadOptionsBackup");
        };
        r.readAsDataURL(pfile.files[0]);
        pfile.value = "";
    }
}
function restoreBase64Json(j) {
    var o;
    try {
        j = $.base64Decode(j);
        o = JSON.parse(j);
    }
    catch (e) {
        Logger.log("Oops! Can't restore from this backup file. The backup file is corrupted or invalid, " + e.toString(), Logger.Types.error);
        InfoTip.alertI18n("message_cannotRestoreOptionsBackup");
        return;
    }
    restoreObject(o);
}
function restoreObject(o) {
    if (!InfoTip.confirmI18n("message_restoreOptionsBackup")) {
        return;
    }
    for (var optionName in o) {
        if (o.hasOwnProperty(optionName)) {
            localStorage[optionName] = o[optionName];
        }
    }
    InfoTip.alertI18n("message_successRestoreOptionsBackup");
    Settings.refreshCache();
    window.location.reload();
}

function getQueryParams() {
    var query = document.location.search || "";
    if (query.indexOf("?") == 0)
        query = query.substring(1);

    query = query.split("&");

    var params = [];
    for (var i in query) {
        if (query.hasOwnProperty(i)) {
            var pair = query[i].split("=");
            params[pair[0]] = pair[1];
        }
    }

    return params;
}

function checkPageParams() {
    var params = getQueryParams();
    if (params["firstTime"] == "true")
        InfoTip.showMessageI18n("message_firstTimeWelcome", InfoTip.types.note, -1);

    switchTab(params["tab"]);
}

function parseProxy(proxy, port) {
    if (proxy == undefined || proxy.length == 0) {
        return {
            host:"",
            port:""
        };
    }

    proxy = fixProxyString(proxy, port);
    var pos = proxy.lastIndexOf(":");
    var host = (pos > 0 ? proxy.substring(0, pos) : proxy);
    port = (pos > 0 ? proxy.substring(pos + 1) : "");
    return {
        host:host,
        port:port
    };
}

function joinProxy(proxy, port, defaultPort) {
    if (proxy.indexOf(":") >= 0 && (proxy[0] != '[' || proxy[proxy.length - 1] != ']'))
        return proxy;

    if (port != undefined && port.trim().length == 0)
        port = defaultPort || "80";

    return proxy + ":" + port;
}

function fixProxyString(proxy, defaultPort) {
    if (proxy == undefined || proxy.length == 0)
        return "";

    if (proxy.indexOf(":") > 0)
        return proxy;

    if (proxy.indexOf(":") == 0)
        return "";

    defaultPort = defaultPort || "80";
    return proxy + ":" + defaultPort;
}
$(document).ready(function () {
    init();
    $("div.color").click(changeColor);
    $("div.delete.row").click(deleteRow);
    $("#btn-new").click(newRow);
    $("#rfile").change(restoreLocal);
    $("#RestoreFileButton").click(function () {
        $("#rfile").click();
    });
    $("#pfile").change(importPAC);
    $("#importPACButton").click(function () {
        $("#pfile").click();
    });
    $("#makeBackup").click(makeBackup);
    $("#restoreBackup").click(restoreBackup);
    $("#resetOptions").click(resetOptions);
    $("#saveOptions").click(saveOptions);
    $("#closeWindow").click(closeWindow);
});

