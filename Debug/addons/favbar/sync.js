Common.FavBar = api.CreateObject("Object");
Common.FavBar.Items = api.CreateObject("Array");

Sync.FavBar = {
	FromPt: function (i, ptc, bFallback) {
		var lastValid = -1;
		for (var j = 0; j < i; j++) {
			if (Common.FavBar.Items[j]) {
				if (PtInRect(Common.FavBar.Items[j], ptc)) {
					return j;
				}
				lastValid = j;
			}
		}
		// if no hit but within vertical range of favbar, return last item
		if (bFallback && lastValid >= 0 && Common.FavBar.Items[lastValid]) {
			var rc = Common.FavBar.Items[lastValid];
			if (ptc.y >= rc.top && ptc.y <= rc.bottom && ptc.x > rc.right) {
				Common.FavBar.RightSide = 1;
				return lastValid;
			}
		}
		return -1;
	},

	RemoveItem: function (i) {
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
	},

	ReorderItems: function (src, dst) {
		var menus = te.Data.xmlMenus.getElementsByTagName('Favorites');
		if (menus && menus.length > 0) {
			var items = menus[0].getElementsByTagName("Item");
			var attrs = ["Name", "Filter", "Type", "Icon", "Org", "Height"];
			var dir = src < dst ? 1 : -1;
			for (var j = src; j !== dst; j += dir) {
				var a = items[j];
				var b = items[j + dir];
				var tmpText = a.text;
				a.text = b.text;
				b.text = tmpText;
				for (var k = 0; k < attrs.length; k++) {
					var va = a.getAttribute(attrs[k]) || "";
					var vb = b.getAttribute(attrs[k]) || "";
					a.setAttribute(attrs[k], vb);
					b.setAttribute(attrs[k], va);
				}
			}
			SaveXmlEx("menus.xml", te.Data.xmlMenus);
			FavoriteChanged();
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
