const Addon_Id = "openinstead";
const item = GetAddonElement(Addon_Id);
if (window.Addon == 1) {
	Addons.OpenInstead = {
		RealFolders: item.getAttribute("RealFolders"),
		SpecialFolders: item.getAttribute("SpecialFolders"),
		TakeOver: item.getAttribute("TakeOver"),

		// Explorer windows that are still Busy are polled again; a slow network
		// share or a cold first launch after boot can take several seconds.
		MaxRetry: 16,

		Worker: async function (Retry) {
			const sw = await sha.Windows();
			for (let i = await sw.Count; i-- > 0;) {
				let exp = await sw.item(i);
				if (exp) {
					let r = await Promise.all([exp.Visible, exp.Busy, exp.Document]);
					if (r[0] && !r[1]) {
						let doc = await r[2];
						if (doc) {
							try {
								let path = await api.GetDisplayNameOf(doc, SHGDN_FORPARSING);
								let url = doc;
								if (!path && /\\explorer\.exe$/i.test(await exp.FullName)) {
									path = await api.PathCreateFromUrl(await exp.LocationURL);
									url = path;
								}
								if (path && Addons.OpenInstead[/^.?:\\|^\\\\/.test(path) ? "RealFolders" : "SpecialFolders"]) {
									const pid = await api.ILCreateFromPath(url);
									if (!await RunEvent3("UseExplorer", pid)) {
										// The item Explorer was asked to select (/select, "Open containing
										// folder"). Read it before hiding the window and regardless of TakeOver.
										const focused = await doc.FocusedItem;
										exp.Visible = false;
										let bQuit = false;
										try {
											let FV = await (await GetFolderView()).Navigate((await pid.ExtendedProperty("linktarget")) || url, SBSP_NEWBROWSER);
											if (Addons.OpenInstead.TakeOver) {
												const v = await Promise.all([doc.CurrentViewMode, doc.IconSize, doc.SortColumns, doc.GroupBy]);
												FV.CurrentViewMode = v[0];
												if (v[1]) {
													FV.IconSize = v[1];
												}
												if (v[2]) {
													FV.SortColumns = v[2];
												}
												if (v[3]) {
													FV.GroupBy = v[3];
												}
											}
											if (focused) {
												FV.SelectItem(focused, SVSI_FOCUSED | SVSI_ENSUREVISIBLE | SVSI_DESELECTOTHERS | SVSI_SELECTIONMARK | SVSI_SELECT);
											}
											exp.Quit();
											bQuit = true;
										} finally {
											if (!bQuit) {
												// Never leave an invisible Explorer window behind
												exp.Visible = true;
											}
										}
										RestoreFromTray();
										api.SetForegroundWindow(ui_.hwnd);
										Retry = 0;
									}
								}
							} catch (e) {
								api.OutputDebugString("[OpenInstead] " + (e.message || e));
							}
						}
					}
				}
			}
			if (Retry > 0) {
				setTimeout(Addons.OpenInstead.Worker, 250, Retry - 1);
			}
		}
	};

	AddEvent("WindowRegistered", function () {
		setTimeout(Addons.OpenInstead.Worker, 500, Addons.OpenInstead.MaxRetry);
	});
} else {
	SetTabContents(0, "", await ReadTextFile("addons\\" + Addon_Id + "\\options.html"));
}
