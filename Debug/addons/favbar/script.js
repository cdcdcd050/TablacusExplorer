const Addon_Id = "favbar";
const Default = "ToolBar4Center";
const item = await GetAddonElement(Addon_Id);
if (window.Addon == 1) {
	Addons.FavBar = {
		DD: false,
		NewTab: item.getAttribute("NewTab"),
		Size: item.getAttribute("Size"),
		dragSrc: -1,
		dragActive: false,

		DragDown: function (ev, i) {
			if (ev.button === 0) {
				Addons.FavBar.dragSrc = i;
				Addons.FavBar.dragActive = false;
			}
		},

		DragMove: function (ev) {
			var src = Addons.FavBar.dragSrc;
			if (src < 0 || ev.buttons !== 1) {
				if (Addons.FavBar.dragActive) Addons.FavBar.DragEnd();
				Addons.FavBar.dragSrc = -1;
				return;
			}
			if (!Addons.FavBar.dragActive) {
				Addons.FavBar.dragActive = true;
				var srcEl = document.getElementById('_favbar' + src);
				if (srcEl) srcEl.style.opacity = '0.4';
			}
			// ghost
			var ghost = document.getElementById('_favbar_ghost');
			if (!ghost) {
				var srcEl = document.getElementById('_favbar' + src);
				if (srcEl) {
					ghost = document.createElement('span');
					ghost.id = '_favbar_ghost';
					ghost.innerHTML = srcEl.innerHTML;
					ghost.className = srcEl.className;
					ghost.style.cssText = 'position:fixed;pointer-events:none;opacity:0.7;z-index:9999;background:#fff;border:1px solid #0078d4;padding:1px 4px;white-space:nowrap;';
					document.body.appendChild(ghost);
				}
			}
			if (ghost) {
				ghost.style.left = ev.clientX + 8 + 'px';
				ghost.style.top = ev.clientY - 8 + 'px';
			}
			// highlight target
			var target = Addons.FavBar.DragHitTest(ev);
			var items = ui_.MenuFavorites;
			if (items) {
				var rightSide = Addons.FavBar.DragIsRight;
				for (var j = 0; j < items.length; j++) {
					var el = document.getElementById('_favbar' + j);
					if (!el) continue;
					el.style.borderLeft = (j === target && target !== src && !rightSide) ? '2px solid #0078d4' : '';
					el.style.borderRight = (j === target && target !== src && rightSide) ? '2px solid #0078d4' : '';
				}
			}
		},

		DragHitTest: function (ev) {
			var items = ui_.MenuFavorites;
			if (!items) return -1;
			Addons.FavBar.DragIsRight = false;
			var lastValid = -1;
			for (var j = 0; j < items.length; j++) {
				var el = document.getElementById('_favbar' + j);
				if (el) {
					lastValid = j;
					var r = el.getBoundingClientRect();
					if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
						var mid = (r.left + r.right) / 2;
						Addons.FavBar.DragIsRight = (ev.clientX > mid);
						return j;
					}
				}
			}
			// anywhere in container after last item → last position
			if (lastValid >= 0) {
				var container = document.getElementById('_favbar');
				var area = container ? container.parentNode : null;
				if (area) {
					var cr = area.getBoundingClientRect();
					if (ev.clientX >= cr.left && ev.clientX <= cr.right && ev.clientY >= cr.top && ev.clientY <= cr.bottom) {
						Addons.FavBar.DragIsRight = true;
						return lastValid;
					}
				}
			}
			return -1;
		},

		DragUp: function (ev) {
			if (Addons.FavBar.dragActive) {
				var src = Addons.FavBar.dragSrc;
				var dst = Addons.FavBar.DragHitTest(ev);
				var rightSide = Addons.FavBar.DragIsRight;
				Addons.FavBar.DragEnd();
				if (dst >= 0) {
					// adjust: right half means "after this item"
					if (rightSide && src > dst) dst++;
					if (!rightSide && src < dst) dst--;
					if (dst !== src && dst >= 0) {
						Sync.FavBar.ReorderItems(src, dst);
					}
				}
			}
			Addons.FavBar.dragSrc = -1;
			Addons.FavBar.dragActive = false;
		},

		DragEnd: function () {
			Addons.FavBar.dragActive = false;
			Addons.FavBar.dragSrc = -1;
			var ghost = document.getElementById('_favbar_ghost');
			if (ghost) ghost.parentNode.removeChild(ghost);
			var items = ui_.MenuFavorites;
			if (items) {
				for (var j = 0; j < items.length; j++) {
					var el = document.getElementById('_favbar' + j);
					if (el) { el.style.opacity = ''; el.style.borderLeft = ''; el.style.borderRight = ''; }
				}
			}
		},

		ReorderUpdateUI: function (target, src, x, y, rightSide) {
			const items = ui_.MenuFavorites;
			if (!items) return;
			// ghost element follows cursor
			let ghost = document.getElementById('_favbar_ghost');
			if (!ghost) {
				const srcEl = document.getElementById('_favbar' + src);
				if (srcEl) {
					ghost = document.createElement('span');
					ghost.id = '_favbar_ghost';
					ghost.innerHTML = srcEl.innerHTML;
					ghost.className = srcEl.className;
					ghost.style.cssText = 'position:fixed;pointer-events:none;opacity:0.7;z-index:9999;background:#fff;border:1px solid #0078d4;padding:1px 4px;white-space:nowrap;';
					document.body.appendChild(ghost);
				}
			}
			if (ghost) {
				ghost.style.left = x + 8 + 'px';
				ghost.style.top = y - 8 + 'px';
			}
			for (let j = 0; j < items.length; j++) {
				const el = document.getElementById('_favbar' + j);
				if (!el) continue;
				el.style.opacity = (j === src) ? '0.4' : '';
				el.style.borderLeft = (j === target && target !== src && !rightSide) ? '2px solid #0078d4' : '';
				el.style.borderRight = (j === target && target !== src && rightSide) ? '2px solid #0078d4' : '';
			}
		},

		ReorderFinishUI: function () {
			Addons.FavBar.dragActive = false;
			const ghost = document.getElementById('_favbar_ghost');
			if (ghost) ghost.parentNode.removeChild(ghost);
			const items = ui_.MenuFavorites;
			if (!items) return;
			for (let j = 0; j < items.length; j++) {
				const el = document.getElementById('_favbar' + j);
				if (!el) continue;
				el.style.opacity = '';
				el.style.borderLeft = '';
				el.style.borderRight = '';
			}
		},


		Click: function (i, bNew) {
			const items = ui_.MenuFavorites;
			const item = items[i];
			if (item) {
				Exec(te, item.text, ((bNew && /^Open$|^Open in background$/i.test(item.Type)) || (SameText(item.Type, "Open") && Addons.FavBar.NewTab)) ? "Open in new tab" : item.Type, ui_.hwnd, null);
			}
		},

		Down: function (ev, i) {
			if ((ev.buttons != null ? ev.buttons : ev.button) == 4) {
				this.Click(i, true);
			}
		},

		Open: async function (ev, i) {
			if (Addons.FavBar.bClose) {
				return S_OK;
			}
			if ((ev.buttons != null ? ev.buttons : ev.button) == 1) {
				const menus = await te.Data.xmlMenus.getElementsByTagName('Favorites');
				if (menus && await GetLength(menus)) {
					const items = await menus[0].getElementsByTagName("Item");
					let item = items[i];
					const hMenu = await api.CreatePopupMenu();
					const arMenu = await api.CreateObject("Array");
					for (let j = await GetLength(items); --j > i;) {
						await arMenu.unshift(j);
					}
					const o = document.getElementById("_favbar" + i);
					const pt = await GetPosEx(o, 9);
					await MakeMenus(hMenu, null, arMenu, items, te, pt);
					await AdjustMenuBreak(hMenu);
					AddEvent("ExitMenuLoop", function () {
						Addons.FavBar.bClose = true;
						setTimeout(function () {
							Addons.FavBar.bClose = false;
						}, 99);
					});
					window.g_menu_click = 2;
					const nVerb = await api.TrackPopupMenuEx(hMenu, TPM_RIGHTBUTTON | TPM_RETURNCMD, await pt.x, await pt.y, ui_.hwnd, null);
					api.DestroyMenu(hMenu);
					if (nVerb > 0) {
						item = await items[nVerb - 1];
						let strType = await item.getAttribute("Type");
						if (SameText(strType, "Open") && (window.g_menu_button == 3 || Addons.FavBar.NewTab)) {
							strType = "Open in new tab";
						}
						if (window.g_menu_button == 2 && /^Open$|^Open in new tab$|^Open in background$/i.test(strType)) {
							PopupContextMenu(await item.text);
							return S_OK;
						}
						Exec(te, await item.text, strType, ui_.hwnd, null);
					}
					return S_OK;
				}
			}
		},

		Popup: async function (ev, i) {
			const items = ui_.MenuFavorites;
			if (i >= 0) {
				const hMenu = await api.CreatePopupMenu();
				let ContextMenu = null;
				if (i < items.length) {
					const path = this.GetPath(items, i);
					if (path != "") {
						ContextMenu = await api.ContextMenu(path);
					}
				}
				if (ContextMenu) {
					await ContextMenu.QueryContextMenu(hMenu, 0, 0x1001, 0x7FFF, CMF_DEFAULTONLY);
					await RemoveCommand(hMenu, ContextMenu, "delete;rename");
					await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
				}
                const MENU_EDIT = 1;
                const MENU_ADD = 2;
                const MENU_REMOVE = 3;
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_EDIT, await GetText("&Edit"));
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_ADD, await GetText("Add"));
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_REMOVE, await GetText("Remove") + "(&D)");
				const x = ev.screenX * ui_.Zoom, y = ev.screenY * ui_.Zoom;
				const nVerb = await api.TrackPopupMenuEx(hMenu, TPM_LEFTALIGN | TPM_LEFTBUTTON | TPM_RIGHTBUTTON | TPM_RETURNCMD, x, y, ui_.hwnd, null, ContextMenu);
				if (nVerb >= 0x1001) {
					const s = await ContextMenu.GetCommandString(nVerb - 0x1001, GCS_VERB);
					if (SameText(s, "delete")) {
						this.ShowOptions();
					} else {
						ContextMenu.InvokeCommand(0, ui_.hwnd, nVerb - 0x1001, null, null, SW_SHOWNORMAL, 0, 0);
					}
				}
				if (nVerb == MENU_EDIT) {
					this.ShowOptions(i);
				}
				if (nVerb == MENU_ADD) {
					this.ShowOptions();
				}
				if (nVerb == MENU_REMOVE) {
					Sync.FavBar.RemoveItem(i);
				}
				api.DestroyMenu(hMenu);
			}
		},

		DropDown: async function (i) {
			const o = document.getElementById("_favbar" + i);
			MouseOver(o);
			const pt = GetPos(o, 9);
			const items = ui_.MenuFavorites;
			const strType = items[i].Type;
			let wFlags = SBSP_SAMEBROWSER;
			if (SameText(strType, "Open in new tab")) {
				wFlags = SBSP_NEWBROWSER;
			} else if (SameText(strType, "Open in background")) {
				wFlags = SBSP_NEWBROWSER | SBSP_ACTIVATE_NOFOCUS;
			}
			FolderMenu.Invoke(await FolderMenu.Open(items[i].text.split("\n")[0], pt.x, pt.y, "*", 1), wFlags);
		},

		Arrange: async function () {
			const s = [];
			const items = await Addons.FavBar.GetFovorites();
			let menus = 0;
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				const strFlag = SameText(item.Type, "menus") ? item.text.toLowerCase() : "";
				const strName = EncodeSC(await ExtractMacro(te, item.Name.replace(/\\t.*$/g, "").replace(/&(.)/g, "$1")));
				if (strFlag == "close" && menus) {
					menus--;
					continue;
				}
				if (strFlag == "open") {
					if (menus++) {
						continue;
					}
				} else if (menus) {
					continue;
				} else if (/^\s*$/.exec(strName)) {
                    continue;
				} else if (strName == "/" || strFlag == "break") {
					s.push('<br class="break">');
					continue;
				} else if (strName == "//" || strFlag == "barbreak") {
					s.push('<hr class="barbreak">');
					continue;
				} else if (strName == "-" || strFlag == "separator") {
					s.push('<span class="separator">|</span>');
					continue;
				}
				let img = '';
				const icon = item.Icon;
				if (icon != "-") {
					const h = GetIconSize(item.Height || Addons.FavBar.Size, 16);
					if (icon) {
						img = await GetImgTag({ src: await ExtractMacro(te, icon) }, h);
					} else if (/^Open$|^Open in new tab$|^Open in background$|^Exec$/i.test(item.Type)) {
						const path = await Addons.FavBar.GetPath(items, i);
						let pidl = await api.ILCreateFromPath(path);
						if (await api.ILIsEmpty(pidl) || await pidl.Unavailable) {
							const res = /"([^"]*)"/.exec(path) || /([^\s]*)/.exec(path);
							if (res) {
								pidl = await api.ILCreateFromPath(res[1]);
							}
						}
						img = await GetImgTag({ src: await GetIconImage(pidl, CLR_DEFAULT | COLOR_WINDOW) }, h);
					} else if (strFlag == "open") {
						img = await GetImgTag({ src: "folder:closed" }, h);
					}
				}
				s.push('<span id="_favbar', i, '" ', !SameText(item.Type, "menus") || !SameText(item.text, "Open") ? 'onclick="if(!Addons.FavBar.dragActive)Addons.FavBar.Click(' + i + ')" onmousedown="Addons.FavBar.DragDown(event,' + i + ');Addons.FavBar.Down(event, ' : 'onmousedown="Addons.FavBar.DragDown(event,' + i + ');Addons.FavBar.Open(event, ');
				s.push(i, ')" oncontextmenu="return Addons.FavBar.Popup(event, ', i, '); return false;" onmouseover="if(!Addons.FavBar.dragActive)MouseOver(this)" onmouseout="MouseOut()" class="button" title="', EncodeSC(item.text), '">', img, (img && strName) ? '<span style="margin-left:3px"></span>' : '', strName, '</span>');
				if (Addons.FavBar.DD && /^Open$|^Open in new tab$|^Open in background$/i.test(item.Type)) {
					s.push('<div class="button" onmouseover="MouseOver(this);" onmouseout="MouseOut()" onclick="Addons.FavBar.DropDown(', i, ')">', BUTTONS.dropdown, '</div>');
				} else {
					s.push('<span style="display:inline-block;width:5px"></span>');
				}
			}
			s.push('<span id="_favbar_tail" class="button" onclick="Addons.FavBar.ShowOptions()" onmouseover="if(!Addons.FavBar.dragActive)MouseOver(this)" onmouseout="MouseOut()" title="Add" style="position:absolute;right:2px;top:0;padding:1px 4px;cursor:pointer">+</span>');

			const o = document.getElementById('_favbar');
			o.innerHTML = s.join("");
			var td = o.parentNode;
			if (td && !td._favbarEvents) {
				td.style.position = 'relative';
				td.onmousemove = function(ev) { Addons.FavBar.DragMove(ev); };
				td.onmouseup = function(ev) { Addons.FavBar.DragUp(ev); };
				td._favbarEvents = true;
			}
			Resize();
			setTimeout(function () { Addons.FavBar.SetRects(); }, 50);
		},

		GetFovorites: async function () {
			if(!ui_.MenuFavorites) {
				const menus = await te.Data.xmlMenus.getElementsByTagName('Favorites');
				if (menus && await GetLength(menus)) {
					ui_.MenuFavorites = await GetXmlItems(await menus[0].getElementsByTagName("Item"));
				}
			}
			return ui_.MenuFavorites;
		},

		ShowOptions: function (i) {
			ShowOptions("Tab=Menus&Menus=Favorites" + (isFinite(i) ? "," + i : ""));
		},

		GetPath: async function (items, i) {
			const line = items[i].text.split("\n");
			return await ExtractPath(null, line[0]);
		},

		SetRects: async function () {
			const items = await Addons.FavBar.GetFovorites();
			Common.FavBar.ItemCount = items.length;
			for (let i = 0; i < items.length; ++i) {
				const el = document.getElementById("_favbar" + i);
				if (el) {
					Common.FavBar.Items[i] = await GetRect(el);
				}
			}
			var favbarEl = document.getElementById('_favbar');
			Common.FavBar.Append = await GetRect(favbarEl ? favbarEl.parentNode : null);
		},

		SetScreenRect: async function () {
			var el = document.getElementById("_favbar");
			if (el) {
				var rect = el.getBoundingClientRect();
				var hwnd = await WebBrowser.hwnd;
				var pt1 = await api.Memory("POINT");
				pt1.x = Math.round(rect.left);
				pt1.y = Math.round(rect.top);
				await api.ClientToScreen(hwnd, pt1);
				var pt2 = await api.Memory("POINT");
				pt2.x = Math.round(rect.right);
				pt2.y = Math.round(rect.bottom);
				await api.ClientToScreen(hwnd, pt2);
				Common.FavBar.ScreenRect = {left: pt1.x, top: pt1.y, right: pt2.x, bottom: pt2.y};
			}
		}
	};

	AddEvent("Layout", function () {
		SetAddon(Addon_Id, Default, '<span id="_favbar" style="white-space:nowrap"></span>');
	});

	AddEvent("FavoriteChanged", Addons.FavBar.Arrange);

	AddEvent("Load", function () {
		Addons.FavBar.Arrange();
		setTimeout(function () {
			Addons.FavBar.SetScreenRect();
		}, 500);
	});

	$.importScript("addons\\" + Addon_Id + "\\sync.js");
} else {
	SetTabContents(0, "General", await ReadTextFile("addons\\" + Addon_Id + "\\options.html"));
}
