Common.FavBar = api.CreateObject("Object");
Common.FavBar.Items = api.CreateObject("Array");
Common.FavBar.DropScreenX = 0;
Common.FavBar.DropScreenY = 0;
Common.FavBar.DragOverX = 0;
Common.FavBar.DragOverY = 0;
Sync.FavBar = {
	Log: function (msg) {
		var s = "[FavBar:sync] " + msg;
		api.OutputDebugString(s + "\n");
		InvokeUI("Addons.FavBar.Log", [s]);
	},

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

	InsertItem: function (index, name, text, type, icon) {
		const xml = te.Data.xmlMenus;
		const menus = xml.getElementsByTagName("Favorites");
		if (menus && menus.length > 0) {
			const item = xml.createElement("Item");
			item.setAttribute("Name", (name || "").replace(/\\/g, "/"));
			item.setAttribute("Type", type || "Open");
			item.setAttribute("Filter", "");
			if (icon) item.setAttribute("Icon", icon);
			item.text = text;
			const items = menus[0].getElementsByTagName("Item");
			if (index >= 0 && index < items.length) {
				menus[0].insertBefore(item, items[index]);
			} else {
				menus[0].appendChild(item);
			}
			SaveXmlEx("menus.xml", xml);
			FavoriteChanged();
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
	InvokeUI("Addons.FavBar.ShowDropIndicator", [pt.x, pt.y]);
	pdwEffect[0] = DROPEFFECT_LINK;
	return S_OK;
});

AddEvent("DragOver", function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
	pdwEffect[0] = DROPEFFECT_LINK;
	InvokeUI("Addons.FavBar.ShowDropIndicator", [pt.x, pt.y]);
	return S_OK;
});

AddEvent("DragLeave", function (Ctrl) {
	InvokeUI("Addons.FavBar.ClearDropIndicator", []);
});

AddEvent("Drop", function (Ctrl, dataObj, grfKeyState, pt, pdwEffect) {
	if (dataObj.Count) {
		Sync.FavBar.Log('Drop: pt=(' + pt.x + ',' + pt.y + ') count=' + dataObj.Count);
		Common.FavBar.DropScreenX = +pt.x;
		Common.FavBar.DropScreenY = +pt.y;
		Common.FavBar.DropItem = dataObj.Item(0);
		InvokeUI("Addons.FavBar.HandleDrop");
		return S_OK;
	}
});
