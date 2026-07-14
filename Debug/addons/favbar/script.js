const Addon_Id = "favbar";
const Default = "ToolBar4Center";
const item = await GetAddonElement(Addon_Id);
if (window.Addon == 1) {
	Addons.FavBar = {
		DD: false,
		NewTab: item.getAttribute("NewTab"),
		Size: item.getAttribute("Size"),
		dragSrc: -1,
		dragSrcRow: -1,
		dragActive: false,

		_debug: true,
		_logs: [],
		_screenOffsetX: 0,
		_screenOffsetY: 0,
		_dropTarget: null,

		Log: function (msg) {
			if (!Addons.FavBar._debug) return;
			var now = new Date();
			var ts = ('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2)+':'+('0'+now.getSeconds()).slice(-2)+'.'+('00'+now.getMilliseconds()).slice(-3);
			var text = typeof msg === 'string' && msg.indexOf('] ') > 0 ? msg : '[FavBar:ui] ' + msg;
			var entry = ts + ' ' + text;
			Addons.FavBar._logs.push(entry);
			if (Addons.FavBar._logs.length > 500) Addons.FavBar._logs.shift();
			if (typeof api !== 'undefined' && api.OutputDebugString && !/^\[FavBar:sync\]/.test(text)) {
				api.OutputDebugString(text + '\n');
			}
		},

		ShowDebugLog: function () {
			var logs = Addons.FavBar._logs;
			var text = logs.length ? logs.join('\n') : '(로그 없음)';
			InputDialog('FavBar Debug Log', text, function () {});
		},

		ClearDebugLog: function () {
			Addons.FavBar._logs = [];
		},

		ToggleDebug: function () {
			Addons.FavBar._debug = !Addons.FavBar._debug;
			Addons.FavBar.Log('Debug ' + (Addons.FavBar._debug ? 'ON' : 'OFF'));
		},

		RenderSep: function (name) {
			var colorMap = { "-": "#555", "-red": "#F00", "-blue": "#22F", "-green": "#090", "-orange": "#F80", "-purple": "#80F", "-cyan": "#09D", "-pink": "#F59", "-yellow": "#DC0", "-brown": "#864" };
			var color = colorMap[name] || "#555";
			var width = name == "-" ? "1" : "2";
			return '<span style="display:inline-block;width:0;border-left:' + width + 'px solid ' + color + ';height:16px;position:relative;top:2px"></span>';
		},

		ToggleWrap: function () {
			var wrap = localStorage.getItem('favbar_wrap') !== '0';
			localStorage.setItem('favbar_wrap', wrap ? '0' : '1');
			Addons.FavBar.Arrange();
		},


		DragDown: function (ev, i) {
			if (ev.button === 0) {
				Addons.FavBar.dragSrcRow = -1;
				Addons.FavBar.dragSrc = i;
				Addons.FavBar.dragActive = false;
				document.addEventListener('mousemove', Addons.FavBar._onDocDragMove);
				document.addEventListener('mouseup', Addons.FavBar._onDocDragUp);
			}
		},

		DragDownExtra: function (ev, ri, ii) {
			if (ev.button === 0) {
				Addons.FavBar.dragSrcRow = ri;
				Addons.FavBar.dragSrc = ii;
				Addons.FavBar.dragActive = false;
				document.addEventListener('mousemove', Addons.FavBar._onDocDragMove);
				document.addEventListener('mouseup', Addons.FavBar._onDocDragUp);
			}
		},

		_getSrcEl: function () {
			var FB = Addons.FavBar;
			return FB.dragSrcRow < 0
				? document.getElementById('_favbar' + FB.dragSrc)
				: document.getElementById('_favbar_ex' + FB.dragSrcRow + '_' + FB.dragSrc);
		},

		_onDocDragMove: function (ev) {
			var FB = Addons.FavBar;
			if (FB.dragSrc < 0 || ev.buttons !== 1) {
				if (FB.dragActive) FB._dragCleanup();
				FB.dragSrc = -1;
				FB.dragSrcRow = -1;
				document.removeEventListener('mousemove', FB._onDocDragMove);
				document.removeEventListener('mouseup', FB._onDocDragUp);
				return;
			}
			if (!FB.dragActive) {
				FB.dragActive = true;
				var srcEl = FB._getSrcEl();
				if (srcEl) srcEl.style.opacity = '0.4';
			}
			var ghost = document.getElementById('_favbar_ghost');
			if (!ghost) {
				var srcEl = FB._getSrcEl();
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
			FB._clearDragHighlights();
			var hit = FB._hitTestAll(ev);
			if (hit) {
				var el = hit.row < 0
					? document.getElementById('_favbar' + hit.index)
					: document.getElementById('_favbar_ex' + hit.row + '_' + hit.index);
				if (el && !(hit.row === FB.dragSrcRow && hit.index === FB.dragSrc)) {
					el.style[hit.rightSide ? 'borderRight' : 'borderLeft'] = '2px solid #0078d4';
				}
			}
		},

		_onDocDragUp: function (ev) {
			var FB = Addons.FavBar;
			document.removeEventListener('mousemove', FB._onDocDragMove);
			document.removeEventListener('mouseup', FB._onDocDragUp);
			if (FB.dragActive) {
				var srcRow = FB.dragSrcRow;
				var srcIndex = FB.dragSrc;
				var hit = FB._hitTestAll(ev);
				FB._dragCleanup();
				if (hit && !(hit.row === srcRow && hit.index === srcIndex)) {
					FB._executeDragMove(srcRow, srcIndex, hit.row, hit.index, hit.rightSide);
				}
			}
			FB.dragSrc = -1;
			FB.dragSrcRow = -1;
			FB.dragActive = false;
		},

		_hitTestAll: function (ev) {
			var mainItems = ui_.MenuFavorites;
			if (mainItems) {
				for (var j = 0; j < mainItems.length; j++) {
					var el = document.getElementById('_favbar' + j);
					if (el) {
						var r = el.getBoundingClientRect();
						if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
							return { row: -1, index: j, rightSide: ev.clientX > (r.left + r.right) / 2 };
						}
					}
				}
				var container = document.getElementById('_favbar');
				var area = container ? container.parentNode : null;
				if (area) {
					var cr = area.getBoundingClientRect();
					if (ev.clientX >= cr.left && ev.clientX <= cr.right && ev.clientY >= cr.top && ev.clientY <= cr.bottom) {
						if (mainItems.length === 0) return { row: -1, index: 0, rightSide: false };
						return { row: -1, index: mainItems.length - 1, rightSide: true };
					}
				}
			}
			var rows = Addons.FavBar.GetExtraRows();
			for (var ri = 0; ri < rows.length; ri++) {
				var items = rows[ri].items || [];
				for (var ii = 0; ii < items.length; ii++) {
					var el = document.getElementById('_favbar_ex' + ri + '_' + ii);
					if (el) {
						var r = el.getBoundingClientRect();
						if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
							return { row: ri, index: ii, rightSide: ev.clientX > (r.left + r.right) / 2 };
						}
					}
				}
				var rowEl = document.getElementById('_favbar_ex' + ri);
				var rowArea = rowEl ? rowEl.parentNode : null;
				if (rowArea) {
					var cr = rowArea.getBoundingClientRect();
					if (ev.clientX >= cr.left && ev.clientX <= cr.right && ev.clientY >= cr.top && ev.clientY <= cr.bottom) {
						if (items.length === 0) return { row: ri, index: 0, rightSide: false };
						return { row: ri, index: items.length - 1, rightSide: true };
					}
				}
			}
			return null;
		},

		_clearDragHighlights: function () {
			var FB = Addons.FavBar;
			var mainItems = ui_.MenuFavorites;
			if (mainItems) {
				for (var j = 0; j < mainItems.length; j++) {
					var el = document.getElementById('_favbar' + j);
					if (el) { el.style.borderLeft = ''; el.style.borderRight = ''; el.style.opacity = ''; }
				}
			}
			var rows = FB.GetExtraRows();
			for (var ri = 0; ri < rows.length; ri++) {
				var items = rows[ri].items || [];
				for (var ii = 0; ii < items.length; ii++) {
					var el = document.getElementById('_favbar_ex' + ri + '_' + ii);
					if (el) { el.style.borderLeft = ''; el.style.borderRight = ''; el.style.opacity = ''; }
				}
			}
			if (FB.dragActive && FB.dragSrc >= 0) {
				var srcEl = FB._getSrcEl();
				if (srcEl) srcEl.style.opacity = '0.4';
			}
		},

		_dragCleanup: function () {
			var FB = Addons.FavBar;
			FB.dragActive = false;
			var ghost = document.getElementById('_favbar_ghost');
			if (ghost) ghost.parentNode.removeChild(ghost);
			var mainItems = ui_.MenuFavorites;
			if (mainItems) {
				for (var j = 0; j < mainItems.length; j++) {
					var el = document.getElementById('_favbar' + j);
					if (el) { el.style.opacity = ''; el.style.borderLeft = ''; el.style.borderRight = ''; }
				}
			}
			var rows = FB.GetExtraRows();
			for (var ri = 0; ri < rows.length; ri++) {
				var items = rows[ri].items || [];
				for (var ii = 0; ii < items.length; ii++) {
					var el = document.getElementById('_favbar_ex' + ri + '_' + ii);
					if (el) { el.style.opacity = ''; el.style.borderLeft = ''; el.style.borderRight = ''; }
				}
			}
		},

		_executeDragMove: function (srcRow, srcIdx, dstRow, dstIdx, rightSide) {
			var srcItem;
			if (srcRow < 0) {
				var mainItems = ui_.MenuFavorites;
				if (!mainItems || !mainItems[srcIdx]) return;
				srcItem = { Name: mainItems[srcIdx].Name, text: mainItems[srcIdx].text, Type: mainItems[srcIdx].Type, Icon: mainItems[srcIdx].Icon || "" };
			} else {
				var rows = Addons.FavBar.GetExtraRows();
				if (!rows[srcRow] || !rows[srcRow].items[srcIdx]) return;
				srcItem = { Name: rows[srcRow].items[srcIdx].Name, text: rows[srcRow].items[srcIdx].text, Type: rows[srcRow].items[srcIdx].Type, Icon: rows[srcRow].items[srcIdx].Icon || "" };
			}

			if (srcRow === dstRow) {
				var adjustedDst = dstIdx;
				if (rightSide && srcIdx > dstIdx) adjustedDst++;
				if (!rightSide && srcIdx < dstIdx) adjustedDst--;
				if (adjustedDst === srcIdx || adjustedDst < 0) return;
				if (srcRow < 0) {
					Sync.FavBar.ReorderItems(srcIdx, adjustedDst);
				} else {
					var rows = Addons.FavBar.GetExtraRows();
					var items = rows[srcRow].items;
					var item = items.splice(srcIdx, 1)[0];
					if (adjustedDst > items.length) adjustedDst = items.length;
					items.splice(adjustedDst, 0, item);
					Addons.FavBar.SaveExtraRows(rows);
					Addons.FavBar.ArrangeExtraRows();
				}
			} else {
				var insertIdx = rightSide ? dstIdx + 1 : dstIdx;
				// Remove from source first (update localStorage before triggering events)
				if (srcRow >= 0) {
					var rows = Addons.FavBar.GetExtraRows();
					if (rows[srcRow]) {
						rows[srcRow].items.splice(srcIdx, 1);
						Addons.FavBar.SaveExtraRows(rows);
					}
				}
				// Add to destination
				if (dstRow >= 0) {
					var rows = Addons.FavBar.GetExtraRows();
					if (rows[dstRow]) {
						if (insertIdx > rows[dstRow].items.length) insertIdx = rows[dstRow].items.length;
						rows[dstRow].items.splice(insertIdx, 0, srcItem);
						Addons.FavBar.SaveExtraRows(rows);
					}
				}
				// Main favbar operations (trigger FavoriteChanged → Arrange → ArrangeExtraRows)
				if (srcRow < 0) {
					Sync.FavBar.RemoveItem(srcIdx);
				}
				if (dstRow < 0) {
					Sync.FavBar.InsertItem(insertIdx, srcItem.Name, srcItem.text, srcItem.Type, srcItem.Icon);
				}
				// If both are extra rows, refresh manually
				if (srcRow >= 0 && dstRow >= 0) {
					Addons.FavBar.ArrangeExtraRows();
				}
			}
		},


		Click: async function (i, bNew) {
			const items = ui_.MenuFavorites;
			const item = items[i];
			if (item) {
				if (!bNew && /^Open$/i.test(item.Type)) {
					var path = item.text.split("\n")[0];
					if (await Addons.FavBar.SwitchToTab(path)) return;
				}
				Exec(te, item.text, ((bNew && /^Open$|^Open in background$/i.test(item.Type)) || (SameText(item.Type, "Open") && Addons.FavBar.NewTab)) ? "Open in new tab" : item.Type, ui_.hwnd, null);
			}
		},

		Down: function (ev, i) {
			if ((ev.buttons != null ? ev.buttons : ev.button) == 4) {
				this.Click(i, true);
			}
		},

		SwitchToTab: async function (path) {
			var cTC = await te.Ctrls(CTRL_TC);
			for (var t = 0; t < await GetLength(cTC); t++) {
				var TC = await cTC.Item(t);
				for (var j = 0; j < await TC.Count; j++) {
					var FV = await TC.Item(j);
					if (FV && await api.ILIsEqual(FV, path)) {
						TC.SelectedIndex = j;
						await FV.Focus();
						return true;
					}
				}
			}
			return false;
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
                const MENU_WRAP = 4;
                const MENU_DEBUG = 5;
                const MENU_DEBUGLOG = 6;
                const MENU_DEBUGCLEAR = 7;
                const MENU_SEP_BLACK = 8;
                const MENU_SEP_RED = 9;
                const MENU_FONTUP = 10;
                const MENU_FONTDOWN = 11;
                const MENU_FONTRESET = 12;
                const MENU_SEP_BLUE = 13;
                const MENU_SEP_GREEN = 14;
                const MENU_SEP_ORANGE = 15;
                const MENU_SEP_PURPLE = 16;
                const MENU_SEP_CYAN = 17;
                const MENU_SEP_PINK = 18;
                const MENU_SEP_YELLOW = 19;
                const MENU_SEP_BROWN = 20;
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_EDIT, await GetText("&Edit"));
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_BLACK, "구분선 추가 (검정)");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_RED, "구분선 추가 (빨강)");
				var hSepMenu = await api.CreatePopupMenu();
				await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_BLUE, "━ 파랑");
				await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_GREEN, "━ 초록");
				await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_ORANGE, "━ 주황");
				await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_PURPLE, "━ 보라");
				await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_CYAN, "━ 하늘");
				await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_PINK, "━ 분홍");
				await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_YELLOW, "━ 노랑");
				await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_BROWN, "━ 갈색");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_POPUP, hSepMenu, "구분선 추가 (기타)");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_REMOVE, await GetText("Remove") + "(&D)");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
				var wrapState = localStorage.getItem('favbar_wrap') !== '0';
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING | (wrapState ? MF_CHECKED : 0), MENU_WRAP, "즐겨찾기바 줄바꿈");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
				var fontDelta = +await Common.FavBar._fontDelta || 0;
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_FONTUP, "폰트 크기 + (현재: " + fontDelta + ")");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_FONTDOWN, "폰트 크기 -");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_FONTRESET, "폰트 크기 초기화");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING | (Addons.FavBar._debug ? MF_CHECKED : 0), MENU_DEBUG, "디버그 모드");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_DEBUGLOG, "디버그 로그 보기");
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_DEBUGCLEAR, "디버그 로그 초기화");
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
					var items2 = ui_.MenuFavorites;
					if (items2 && items2[i]) {
						InputDialog("이름 편집", items2[i].Name.replace(/&(.)/g, "$1"), function (newName) {
							if (newName) {
								Sync.FavBar.EditItem(i, newName);
							}
						});
					}
				}
if (nVerb == MENU_REMOVE) {
					Sync.FavBar.RemoveItem(i);
				}
				var sepNames = { [MENU_SEP_BLACK]: "-", [MENU_SEP_RED]: "-red", [MENU_SEP_BLUE]: "-blue", [MENU_SEP_GREEN]: "-green", [MENU_SEP_ORANGE]: "-orange", [MENU_SEP_PURPLE]: "-purple", [MENU_SEP_CYAN]: "-cyan", [MENU_SEP_PINK]: "-pink", [MENU_SEP_YELLOW]: "-yellow", [MENU_SEP_BROWN]: "-brown" };
				if (sepNames[nVerb]) {
					Sync.FavBar.InsertItem(i, sepNames[nVerb], "", "");
				}
				if (nVerb == MENU_WRAP) {
					Addons.FavBar.ToggleWrap();
				}
				if (nVerb == MENU_DEBUG) {
					Addons.FavBar.ToggleDebug();
				}
				if (nVerb == MENU_DEBUGLOG) {
					Addons.FavBar.ShowDebugLog();
				}
				if (nVerb == MENU_DEBUGCLEAR) {
					Addons.FavBar.ClearDebugLog();
				}
				if (nVerb == MENU_FONTUP || nVerb == MENU_FONTDOWN || nVerb == MENU_FONTRESET) {
					var cur = +await Common.FavBar._fontDelta || 0;
					if (nVerb == MENU_FONTUP) cur++;
					else if (nVerb == MENU_FONTDOWN) cur--;
					else cur = 0;
					Addons.FavBar.Log('FontDelta: ' + cur);
					Common.FavBar._fontDelta = cur;
					localStorage.setItem('favbar_fontDelta', cur);
					// Create font
					var lf = await api.Memory("LOGFONT");
					await api.SystemParametersInfo(SPI_GETICONTITLELOGFONT, await lf.Size, lf, 0);
					var origH = +await lf.lfHeight;
					if (cur != 0) {
						lf.lfHeight = origH - cur;
					}
					var newFont = await api.CreateFontIndirect(lf);
					Common.FavBar._rowFont = cur != 0 ? newFont : 0;
					Addons.FavBar.Log('Font: origH=' + origH + ' newH=' + (origH - cur) + ' handle=' + newFont);
					// Apply to all tabs
					var cTC = await te.Ctrls(CTRL_TC);
					for (var t = 0; t < await GetLength(cTC); t++) {
						var TC = await cTC.Item(t);
						var cnt = await TC.Count;
						for (var j = 0; j < cnt; j++) {
							var FV = await TC.Item(j);
							var hwnd = FV ? +await FV.hwndList : 0;
							if (hwnd) {
								await api.SendMessage(hwnd, WM_SETFONT, newFont, 1);
							}
						}
					}
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
				} else if (/^-/.test(strName) || strFlag == "separator") {
					var sepHtml = Addons.FavBar.RenderSep(strName);
					s.push('<span id="_favbar', i, '" onmousedown="Addons.FavBar.DragDown(event,', i, ')" oncontextmenu="return Addons.FavBar.Popup(event, ', i, '); return false;" class="separator" style="cursor:default;display:inline-block;vertical-align:middle;margin:0 4px">', sepHtml, '</span>');
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
				s.push(i, ')" oncontextmenu="return Addons.FavBar.Popup(event, ', i, '); return false;" onmouseover="if(!Addons.FavBar.dragActive)MouseOver(this)" onmouseout="MouseOut()" class="button" title="', EncodeSC(item.text), '">', img, (img && strName) ? '<span style="margin-left:3px"></span>' : '', strName ? '<span style="display:inline-block;min-width:4ch;text-align:left">' + strName + '</span>' : '', '</span>');
				if (Addons.FavBar.DD && /^Open$|^Open in new tab$|^Open in background$/i.test(item.Type)) {
					s.push('<div class="button" onmouseover="MouseOver(this);" onmouseout="MouseOut()" onclick="Addons.FavBar.DropDown(', i, ')">', BUTTONS.dropdown, '</div>');
				} else {
					s.push('<span style="display:inline-block;width:5px"></span>');
				}
			}
			s.push('<span id="_favbar_tail" class="button" onclick="Addons.FavBar.AddRow()" onmouseover="if(!Addons.FavBar.dragActive)MouseOver(this)" onmouseout="MouseOut()" title="행 추가" style="position:absolute;right:2px;top:0;padding:1px 6px;font-size:14px;cursor:pointer">+</span>');

			const o = document.getElementById('_favbar');
			o.innerHTML = s.join("");
			var td = o.parentNode;
			if (td && !td._favbarEvents) {
				td.style.position = 'relative';
				td.oncontextmenu = function(ev) { if (ev.target.closest && !ev.target.closest('.button')) ev.preventDefault(); };
				td._favbarEvents = true;
			}
			var wrap = localStorage.getItem('favbar_wrap') !== '0';
			o.style.whiteSpace = wrap ? '' : 'nowrap';
			if (td) {
				td.style.whiteSpace = wrap ? '' : 'nowrap';
				// Reserve space for the absolute-positioned "+" (add row) button so wrapping
				// items don't flow under it (which caused a phantom empty row when narrowed).
				td.style.paddingRight = '28px';
			}
			Resize();
			await Addons.FavBar.ArrangeExtraRows();
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
			// Compute screen-to-client offset
			var refEl = document.getElementById('_favbar');
			if (refEl) {
				var cr = refEl.getBoundingClientRect();
				var hwnd = await WebBrowser.hwnd;
				var pt = await api.Memory("POINT");
				pt.x = Math.round(cr.left);
				pt.y = Math.round(cr.top);
				await api.ClientToScreen(hwnd, pt);
				Addons.FavBar._screenOffsetX = (+await pt.x) - cr.left;
				Addons.FavBar._screenOffsetY = (+await pt.y) - cr.top;
				Addons.FavBar.Log('SetRects: offset=(' + Addons.FavBar._screenOffsetX + ',' + Addons.FavBar._screenOffsetY + ')');
			}
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
		},

		GetExtraRows: function () {
			try {
				return JSON.parse(localStorage.getItem('favbar_extra_rows') || '[]');
			} catch (e) { return []; }
		},

		SaveExtraRows: function (rows) {
			localStorage.setItem('favbar_extra_rows', JSON.stringify(rows));
		},

		AddRow: function () {
			var rows = Addons.FavBar.GetExtraRows();
			rows.push({ items: [] });
			Addons.FavBar.SaveExtraRows(rows);
			Addons.FavBar.ArrangeExtraRows();
		},

		RemoveRow: function (ri) {
			if (!confirm('즐겨찾기바 행을 삭제하시겠습니까?')) return;
			var rows = Addons.FavBar.GetExtraRows();
			rows.splice(ri, 1);
			Addons.FavBar.SaveExtraRows(rows);
			Addons.FavBar.ArrangeExtraRows();
		},

		AddItemToRow: async function (ri) {
			var FV = await te.Ctrl(CTRL_FV);
			if (!FV) return;
			var FolderItem = await FV.FolderItem;
			if (!FolderItem) return;
			var name = await api.GetDisplayNameOf(FolderItem, SHGDN_INFOLDER);
			var path = await FolderItem.Path;
			var newName = prompt("\uc990\uaca8\ucc3e\uae30 \uc774\ub984:", name);
			if (newName) {
				var rows = Addons.FavBar.GetExtraRows();
				if (rows[ri]) {
					rows[ri].items.push({ Name: newName, text: path, Type: "Open" });
					Addons.FavBar.SaveExtraRows(rows);
					Addons.FavBar.ArrangeExtraRows();
				}
			}
		},

		RemoveItemFromRow: function (ri, ii) {
			var rows = Addons.FavBar.GetExtraRows();
			if (rows[ri] && rows[ri].items[ii] !== undefined) {
				rows[ri].items.splice(ii, 1);
				Addons.FavBar.SaveExtraRows(rows);
				Addons.FavBar.ArrangeExtraRows();
			}
		},

		ClickExtraItem: async function (ri, ii) {
			var rows = Addons.FavBar.GetExtraRows();
			if (rows[ri] && rows[ri].items[ii]) {
				var item = rows[ri].items[ii];
				var type = item.Type || "Open";
				if (/^Open$/i.test(type)) {
					if (await Addons.FavBar.SwitchToTab(item.text.split("\n")[0])) return;
					if (Addons.FavBar.NewTab) {
						type = "Open in new tab";
					}
				}
				var Ctrl = await te.Ctrl(CTRL_FV) || te;
				Exec(Ctrl, item.text, type, ui_.hwnd, null);
			}
		},

		PopupExtraItem: async function (ev, ri, ii) {
			ev.preventDefault();
			var hMenu = await api.CreatePopupMenu();
			var MENU_EDIT = 1;
			var MENU_REMOVE = 2;
			var MENU_SEP_BLACK = 3;
			var MENU_SEP_RED = 4;
			var MENU_REMOVE_ROW = 5;
			var MENU_SEP_BLUE = 6;
			var MENU_SEP_GREEN = 7;
			var MENU_SEP_ORANGE = 8;
			var MENU_SEP_PURPLE = 9;
			var MENU_SEP_CYAN = 10;
			var MENU_SEP_PINK = 11;
			var MENU_SEP_YELLOW = 12;
			var MENU_SEP_BROWN = 13;
			await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_EDIT, await GetText("&Edit"));
			await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_BLACK, "구분선 추가 (검정)");
			await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_RED, "구분선 추가 (빨강)");
			var hSepMenu = await api.CreatePopupMenu();
			await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_BLUE, "━ 파랑");
			await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_GREEN, "━ 초록");
			await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_ORANGE, "━ 주황");
			await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_PURPLE, "━ 보라");
			await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_CYAN, "━ 하늘");
			await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_PINK, "━ 분홍");
			await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_YELLOW, "━ 노랑");
			await api.InsertMenu(hSepMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_SEP_BROWN, "━ 갈색");
			await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_POPUP, hSepMenu, "구분선 추가 (기타)");
			await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_REMOVE, await GetText("Remove") + "(&D)");
			await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_SEPARATOR, 0, null);
			await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, MENU_REMOVE_ROW, "행 삭제");
			var x = ev.screenX * ui_.Zoom, y = ev.screenY * ui_.Zoom;
			var nVerb = await api.TrackPopupMenuEx(hMenu, TPM_LEFTALIGN | TPM_LEFTBUTTON | TPM_RIGHTBUTTON | TPM_RETURNCMD, x, y, ui_.hwnd, null);
			if (nVerb == MENU_EDIT) {
				var rows = Addons.FavBar.GetExtraRows();
				if (rows[ri] && rows[ri].items[ii]) {
					InputDialog("이름 편집", rows[ri].items[ii].Name, function (newName) {
						if (newName) {
							var rows2 = Addons.FavBar.GetExtraRows();
							if (rows2[ri] && rows2[ri].items[ii]) {
								rows2[ri].items[ii].Name = newName;
								Addons.FavBar.SaveExtraRows(rows2);
								Addons.FavBar.ArrangeExtraRows();
							}
						}
					});
				}
			}
			var sepNames = { [MENU_SEP_BLACK]: "-", [MENU_SEP_RED]: "-red", [MENU_SEP_BLUE]: "-blue", [MENU_SEP_GREEN]: "-green", [MENU_SEP_ORANGE]: "-orange", [MENU_SEP_PURPLE]: "-purple", [MENU_SEP_CYAN]: "-cyan", [MENU_SEP_PINK]: "-pink", [MENU_SEP_YELLOW]: "-yellow", [MENU_SEP_BROWN]: "-brown" };
			if (sepNames[nVerb]) {
				var rows = Addons.FavBar.GetExtraRows();
				if (rows[ri]) {
					rows[ri].items.splice(ii, 0, { Name: sepNames[nVerb], text: "", Type: "separator" });
					Addons.FavBar.SaveExtraRows(rows);
					Addons.FavBar.ArrangeExtraRows();
				}
			}
			if (nVerb == MENU_REMOVE) {
				Addons.FavBar.RemoveItemFromRow(ri, ii);
			}
			if (nVerb == MENU_REMOVE_ROW) {
				Addons.FavBar.RemoveRow(ri);
			}
			await api.DestroyMenu(hMenu);
		},


		_lastDropLog: 0,
		ShowDropIndicator: function (sx, sy) {
			var cx = sx - Addons.FavBar._screenOffsetX;
			var cy = sy - Addons.FavBar._screenOffsetY;
			var now = Date.now();
			if (now - Addons.FavBar._lastDropLog > 500) {
				Addons.FavBar.Log('ShowDropIndicator: screen=(' + sx + ',' + sy + ') client=(' + cx.toFixed(0) + ',' + cy.toFixed(0) + ')');
				Addons.FavBar._lastDropLog = now;
			}
			Addons.FavBar._clearDragHighlights();
			var hit = Addons.FavBar._hitTestClient(cx, cy);
			Addons.FavBar._dropTarget = hit;
			if (hit) {
				var el = hit.row < 0
					? document.getElementById('_favbar' + hit.index)
					: document.getElementById('_favbar_ex' + hit.row + '_' + hit.index);
				if (el) {
					el.style[hit.rightSide ? 'borderRight' : 'borderLeft'] = '2px solid #0078d4';
				}
			}
		},

		ClearDropIndicator: function () {
			Addons.FavBar._clearDragHighlights();
			Addons.FavBar._dropTarget = null;
		},

		_hitTestClient: function (cx, cy) {
			var mainItems = ui_.MenuFavorites;
			if (mainItems) {
				for (var j = 0; j < mainItems.length; j++) {
					var el = document.getElementById('_favbar' + j);
					if (el) {
						var r = el.getBoundingClientRect();
						if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
							return { row: -1, index: j, rightSide: cx > (r.left + r.right) / 2 };
						}
					}
				}
				var container = document.getElementById('_favbar');
				var area = container ? container.parentNode : null;
				if (area) {
					var cr = area.getBoundingClientRect();
					if (cx >= cr.left && cx <= cr.right && cy >= cr.top && cy <= cr.bottom) {
						if (mainItems.length === 0) return { row: -1, index: 0, rightSide: false };
						return { row: -1, index: mainItems.length - 1, rightSide: true };
					}
				}
			}
			var rows = Addons.FavBar.GetExtraRows();
			for (var ri = 0; ri < rows.length; ri++) {
				var items = rows[ri].items || [];
				for (var ii = 0; ii < items.length; ii++) {
					var el = document.getElementById('_favbar_ex' + ri + '_' + ii);
					if (el) {
						var r = el.getBoundingClientRect();
						if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
							return { row: ri, index: ii, rightSide: cx > (r.left + r.right) / 2 };
						}
					}
				}
				var rowEl = document.getElementById('_favbar_ex' + ri);
				var rowArea = rowEl ? rowEl.parentNode : null;
				if (rowArea) {
					var cr = rowArea.getBoundingClientRect();
					if (cx >= cr.left && cx <= cr.right && cy >= cr.top && cy <= cr.bottom) {
						if (items.length === 0) return { row: ri, index: 0, rightSide: false };
						return { row: ri, index: items.length - 1, rightSide: true };
					}
				}
			}
			return null;
		},

		HandleDrop: async function () {
			var FolderItem = Common.FavBar.DropItem;
			if (!FolderItem) return;
			var target = Addons.FavBar._dropTarget;
			Addons.FavBar.ClearDropIndicator();
			// Fallback: use Drop coordinates if no target from DragOver
			if (!target) {
				var sx = +await Common.FavBar.DropScreenX;
				var sy = +await Common.FavBar.DropScreenY;
				var cx = sx - Addons.FavBar._screenOffsetX;
				var cy = sy - Addons.FavBar._screenOffsetY;
				target = Addons.FavBar._hitTestClient(cx, cy);
				Addons.FavBar.Log('HandleDrop: fallback hitTest screen=(' + sx + ',' + sy + ') client=(' + cx.toFixed(0) + ',' + cy.toFixed(0) + ') target=' + JSON.stringify(target));
			} else {
				Addons.FavBar.Log('HandleDrop: target=' + JSON.stringify(target));
			}
			if (!target) return;
			var name = String(await api.GetDisplayNameOf(FolderItem, SHGDN_INFOLDER) || "");
			var path = String(await FolderItem.Path || FolderItem);
			if (!name) name = path.replace(/[\\/]+$/, '').replace(/^.*[\\/]/, '') || path;
			if (!await FolderItem.IsFolder && /\.\w+$/.test(name)) {
				name = name.replace(/\.\w+$/, '');
			}
			Addons.FavBar.Log('HandleDrop: name=' + name + ' path=' + path);
			if (!path) return;
			var isFile = await api.PathFileExists(path) && !await api.PathIsDirectory(path);
			var itemType = isFile ? "Exec" : "Open";
			if (isFile) path = PathQuoteSpaces(path);
			Addons.FavBar.Log('HandleDrop: isFile=' + isFile + ' itemType=' + itemType + ' path=' + path);
			var insertIdx = target.rightSide ? target.index + 1 : target.index;
			Addons.FavBar.Log('HandleDrop: row=' + target.row + ' insertIdx=' + insertIdx + ' type=' + itemType);
			if (target.row < 0) {
				Sync.FavBar.InsertItem(insertIdx, name, path, itemType);
			} else {
				var rows = Addons.FavBar.GetExtraRows();
				if (rows[target.row]) {
					if (insertIdx > rows[target.row].items.length) insertIdx = rows[target.row].items.length;
					rows[target.row].items.splice(insertIdx, 0, { Name: name, text: path, Type: itemType });
					Addons.FavBar.SaveExtraRows(rows);
					Addons.FavBar.ArrangeExtraRows();
				}
			}
		},

		ArrangeExtraRows: async function () {
			var existing = document.querySelectorAll('._favbar_extra_table');
			for (var i = 0; i < existing.length; i++) {
				existing[i].remove();
			}

			var rows = Addons.FavBar.GetExtraRows();
			if (rows.length === 0) { Resize(); return; }

			var tb4 = document.getElementById('ToolBar4Center');
			var tb4Table = tb4 ? tb4.closest('table') : null;
			if (!tb4Table) return;

			var insertAfter = tb4Table;
			for (var ri = 0; ri < rows.length; ri++) {
				var row = rows[ri];
				var table = document.createElement('table');
				table.className = 'layout _favbar_extra_table';
				table.onresize = Resize;

				var tr = table.insertRow();
				var tdLeft = tr.insertCell();
				tdLeft.className = 'toolbar1';
				var tdCenter = tr.insertCell();
				tdCenter.className = 'toolbar2';
				tdCenter.style.display = 'table-cell';
				tdCenter.style.position = 'relative';
				tdCenter.style.whiteSpace = 'nowrap';
				tdCenter.style.height = '22px';
				var tdRight = tr.insertCell();
				tdRight.className = 'toolbar3';

				var s = [];
				var items = row.items || [];
				for (var ii = 0; ii < items.length; ii++) {
					var item = items[ii];
					if (/^-/.test(item.Name) || item.Type == 'separator') {
						var sepHtml = Addons.FavBar.RenderSep(item.Name);
						s.push('<span id="_favbar_ex', ri, '_', ii, '" onmousedown="Addons.FavBar.DragDownExtra(event,', ri, ',', ii, ')" oncontextmenu="Addons.FavBar.PopupExtraItem(event,', ri, ',', ii, '); return false;" class="separator" style="cursor:default;display:inline-block;vertical-align:middle;margin:0 4px">', sepHtml, '</span>');
						continue;
					}
					var name = EncodeSC(item.Name);
					var img = '';
					if (item.text) {
						var h = GetIconSize(Addons.FavBar.Size, 16);
						var pidl = await api.ILCreateFromPath(item.text);
						if (pidl && !await api.ILIsEmpty(pidl)) {
							img = await GetImgTag({ src: await GetIconImage(pidl, CLR_DEFAULT | COLOR_WINDOW) }, h);
						}
					}
					s.push('<span id="_favbar_ex', ri, '_', ii, '" onclick="if(!Addons.FavBar.dragActive)Addons.FavBar.ClickExtraItem(', ri, ',', ii, ')" onmousedown="Addons.FavBar.DragDownExtra(event,', ri, ',', ii, ')" oncontextmenu="Addons.FavBar.PopupExtraItem(event,', ri, ',', ii, '); return false;" onmouseover="if(!Addons.FavBar.dragActive)MouseOver(this)" onmouseout="MouseOut()" class="button" title="', EncodeSC(item.text), '">');
					s.push(img);
					if (img && name) s.push('<span style="margin-left:3px"></span>');
					s.push(name ? '<span style="display:inline-block;min-width:4ch;text-align:left">' + name + '</span>' : '', '</span>');
					s.push('<span style="display:inline-block;width:5px"></span>');
				}
				s.push('<span class="button" onclick="Addons.FavBar.RemoveRow(', ri, ')" onmouseover="MouseOver(this)" onmouseout="MouseOut()" title="\ud589 \uc0ad\uc81c" style="position:absolute;right:2px;top:0;padding:1px 6px;font-size:14px;cursor:pointer">&times;</span>');

				tdCenter.innerHTML = '<span id="_favbar_ex' + ri + '">' + s.join('') + '</span>';

				insertAfter.parentNode.insertBefore(table, insertAfter.nextSibling);
				insertAfter = table;

			}
			Resize();
		}
	};

	AddEvent("Layout", function () {
		SetAddon(Addon_Id, Default, '<span id="_favbar"></span>');
	});

	AddEvent("FavoriteChanged", Addons.FavBar.Arrange);

	AddEvent("Load", function () {
		Addons.FavBar.Arrange();
		setTimeout(function () {
			Addons.FavBar.SetScreenRect();
		}, 500);
		// Restore font delta
		var saved = +(localStorage.getItem('favbar_fontDelta') || 0);
		if (saved) {
			Common.FavBar._fontDelta = saved;
		}
	});

	$.importScript("addons\\" + Addon_Id + "\\sync.js");
} else {
	SetTabContents(0, "General", await ReadTextFile("addons\\" + Addon_Id + "\\options.html"));
}
