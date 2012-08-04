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

function init() {
    extension = chrome.extension.getBackgroundPage();
    App = extension.App;
    ProfileManager = extension.ProfileManager;
    Settings = extension.Settings;
    Utils = extension.Utils;
    I18n = extension.I18n;
    I18n.process(document);
    document.body.style.visibility = "visible";

    buildMenuItems();
    initUI();
}
function initUI() {
    $("#about").click(closePopup);

    $(".versionNumber").text(App.version);

    // Reverse buttons order on Linux and Mac OS X
    if (!Utils.OS.isWindows) {
        var btnSaveContainer = $("#btnSave").parent();
        btnSaveContainer.next().next().insertBefore(btnSaveContainer);
        btnSaveContainer.next().insertBefore(btnSaveContainer);
    }
}

function quickSwitchProxy() {
    extension = chrome.extension.getBackgroundPage();
    ProfileManager = extension.ProfileManager;
    Settings = extension.Settings;

    if (!Settings.getValue("quickSwitch", false) && typeof(chrome.flag) == 'undefined')
        return;

    var profile = undefined;
    var currentProfile = ProfileManager.getCurrentProfile();
    var quickSwitchProfiles = Settings.getObject("quickSwitchProfiles") || [];

    var sel = false;
    for (var i in quickSwitchProfiles) {
        if (quickSwitchProfiles.hasOwnProperty(i)) {
            if (sel) {
                sel = false;
                profileId = quickSwitchProfiles[i];
                break;
            }
            if (quickSwitchProfiles[i] == currentProfile.id) {
                sel = true;
            }
        }
    }
    if (sel || typeof(profileId) == "undefined") {
        profileId = quickSwitchProfiles[0];
    }

    if (profileId == ProfileManager.directConnectionProfile.id) {
        profile = ProfileManager.directConnectionProfile;
    }
    else if (profileId == ProfileManager.systemProxyProfile.id) {
        profile = ProfileManager.systemProxyProfile;
    }
    else {
        profile = ProfileManager.getProfile(profileId);
    }

    if (profile == undefined) {
        return;
    }

    window.stop();

    ProfileManager.applyProfile(profile);
    extension.setIconInfo(profile);

    window.close();
    refreshTab();
}

function closePopup() {
    window.close();
}

function refreshTab() {
    if (Settings.getValue("refreshTab", false))
        chrome.tabs.executeScript(null, { code:"history.go(0);" });
}

function openOptions() {
    closePopup();
    extension.openOptions();
}

function openMainWebsite() {
    closePopup();
    chrome.tabs.create({
        url:'http://www.samabox.com/projects/chrome/switchy'
    });
}

function openPlusWebsite() {
    closePopup();
    chrome.tabs.create({
        url:'http://code.google.com/p/switchyplus'
    });
}

function openSupportWebsite() {
    closePopup();
    chrome.tabs.create({
        url:'http://code.google.com/p/switchysharp/issues/list'
    });
}

function showAbout() {
    var currentBodyDirection = document.body.style.direction;	// ....workaround for a Chrome bug
    document.body.style.direction = "ltr";						// ....prevents resizing the popup
    $("#about").css("visibility", "hidden");					// ....

    $("#menu").hide();
    $("#about").show();
    $(document.body).height($("#about").height());
    $(window).height($("#about").height());

    document.body.style.direction = currentBodyDirection;		// ....if the body's direction is "rtl"
    $("#about").css("visibility", "visible");					// ....
}

function clearMenuProxyItems() {
    $("#proxies .item").remove();
}

function buildMenuProxyItems(currentProfile) {
    var profiles = ProfileManager.getSortedProfileArray();
    var menu = $("#proxies");
    var templateItem = $("#proxies .templateItem");
    var combobox = $("#cmbTempProfileId");
    var item;
    for (var i in profiles) {
        if (profiles.hasOwnProperty(i)) {
            var profile = profiles[i];
            item = templateItem.clone().attr({
                "id":profile.id || profile.name,
                "name":profile.name,
                "title":ProfileManager.profileToString(profile, true),
                "class":"item proxy " + profile.color
            });
            $("span", item).text(profile.name);
            item.click(onSelectProxyItem);
            item[0].profile = profile;
            if (ProfileManager.equals(profile, currentProfile))
                item.addClass("checked");

            menu.append(item);
        }
    }

    $("#separatorProxies").show();

    if (currentProfile.unknown && currentProfile.proxyMode != ProfileManager.ProxyModes.direct) {
        item = templateItem.clone().attr({
            "id":currentProfile.id,
            "name":currentProfile.name,
            "title":ProfileManager.profileToString(currentProfile, true),
            "class":"item proxy checked"
        });
        $("span", item).text(currentProfile.name);
        item.click(onSelectProxyItem);
        item[0].profile = currentProfile;

        menu.append(item);

    } else if (profiles.length == 0) {
        $("#separatorProxies").hide();
    }
}

function buildMenuDirectConnectionItem(currentProfile) {
    var item = $("#directConnection");
    item.click(onSelectProxyItem);
    item[0].profile = ProfileManager.directConnectionProfile;;
    if (currentProfile.proxyMode == ProfileManager.ProxyModes.direct)
        item.addClass("checked");
}

function buildMenuSystemProxyItem(currentProfile) {
    var item = $("#systemProxy");
    item.click(onSelectProxyItem);
    item[0].profile = ProfileManager.systemProxyProfile;
    if (currentProfile.proxyMode == ProfileManager.ProxyModes.system)
        item.addClass("checked");
}

function buildMenuItems() {
    var currentProfile = ProfileManager.getCurrentProfile();
    clearMenuProxyItems();
    buildMenuDirectConnectionItem(currentProfile);
    buildMenuSystemProxyItem(currentProfile);
    buildMenuProxyItems(currentProfile);
}

function onSelectProxyItem() {
    if (!event || !event.target)
        return;

    var item = (event.target.id) ? $(event.target) : $(event.target.parentNode); // click on the item or its child?
    var profile = item[0].profile;

    ProfileManager.applyProfile(profile);
    extension.setIconInfo(profile);

    closePopup();

    $("#menu .item").removeClass("checked");
    item.addClass("checked");

    refreshTab();
}

$(document).ready(function () {
    init();
    quickSwitchProxy();
    $("#menuOptions").click(openOptions);
    $("#menuAbout").click(showAbout);
    $("#openMainWebsite").click(openMainWebsite);
    $("#openPlusWebsite").click(openPlusWebsite);
    $("#openSupportWebsite").click(openSupportWebsite);
    $("#btnCancel").click(closePopup);
});