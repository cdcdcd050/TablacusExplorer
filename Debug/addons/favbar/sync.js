Common.FavBar = api.CreateObject("Object");
Common.FavBar.Items = api.CreateObject("Array");

Sync.FavBar = {
	FromPt: function (i, ptc) {
		while (--i >= 0) {
			if (PtInRect(Common.FavBar.Items[i], ptc)) {
				return i;
			}
		}
		return -1;
	},

	RemoveItem: function (i) {
		if (confirmOk()) {
			const xml = te.Data.xmlMenus;
			const menus = te.Data.xmlMenus.getElementsByTagName('Favorites');
			if (menus && menus.length > 0) {
				const items = menus[0].getElementsByTagName("Item");
				if (items && items[i]) {
					menus[0].removeChild(items[i]);
					SaveXmlEx("menus.xml", xml);
					FavoriteChanged();
				}
			}
		}
	}
}

AddEvent("DragEnter", function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
	InvokeUI("Addons.FavBar.SetRects");
	pdwEffect[0] = DROPEFFECT_LINK;
	return S_OK;
});

AddEvent("DragOver", function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
	pdwEffect[0] = DROPEFFECT_LINK;
	return S_OK;
});

AddEvent("Drop", function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
	if (dataObj.Count) {
		setTimeout(function () {
			AddFavorite(dataObj.Item(0));
		}, 99);
		return S_OK;
	}
});
