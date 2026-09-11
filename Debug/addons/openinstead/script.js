const Addon_Id = "openinstead";
const item = GetAddonElement(Addon_Id);
if (window.Addon == 1) {
	Addons.OpenInstead = {
		RealFolders: item.getAttribute("RealFolders"),
		SpecialFolders: item.getAttribute("SpecialFolders"),
		TakeOver: item.getAttribute("TakeOver"),

		// Explorer windows that are still Busy are polled again; a slow network
		// share or a cold first launch after boot can take several seconds. The first
		// passes are close together because the window is painted and has the foreground
		// about 290ms in and is usually ready shortly after - hiding it a retry sooner is
		// the difference between a flash the user reads as "Explorer opened" and one they
		// do not notice (measured ~300ms visible before, ~200ms after). The slow passes
		// keep the old ~4.5s of total coverage: 8 x 60ms + 17 x 250ms.
		MaxRetry: 25,
		FastRetry: 8,
		FastInterval: 60,
		Interval: 250,

		Worker: async function (Retry) {
			const sw = await sha.Windows();
			for (let i = await sw.Count; i-- > 0;) {
				let exp = await sw.item(i);
				if (exp) {
					let r = await Promise.all([exp.Visible, exp.Busy, exp.Document]);
					// Busy has to stay a gate even though waiting for it is most of the window's
					// visible life: taking over a Busy window reads doc.FocusedItem before the view
					// has it, and the takeover then selects the wrong file - measured, it kept the
					// previously focused item in that folder. A ~200ms flash beats selecting the
					// wrong download, so the flash is only narrowed by polling sooner, not by
					// dropping this check.
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
										// Read the handle before hiding: it is how the close is confirmed below.
										// Falling back to 0 keeps the old behaviour (trust Quit) rather than
										// giving up the takeover, should the property not come through.
										let hwndExp = 0;
										try {
											hwndExp = await exp.HWND;
										} catch (e) {
											api.OutputDebugString("[OpenInstead] no HWND: " + (e.message || e));
										}
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
											await exp.Quit();
											// Quit used to be fire-and-forget and bQuit was set before it resolved,
											// so a close that failed - or that another shell extension vetoed -
											// went unnoticed and left the window invisible for good, which is the
											// one thing the finally below exists to prevent. Trust the close only
											// once the window is really gone: a leftover hidden window was on the
											// scene of a system wide ShellExecute hang (docs/troubleshooting.md).
											for (let i = 20; i-- > 0;) {
												bQuit = !hwndExp || !await api.IsWindow(hwndExp);
												if (bQuit) {
													break;
												}
												await new Promise(function (resolve) { setTimeout(resolve, 100); });
											}
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
				const oi = Addons.OpenInstead;
				setTimeout(oi.Worker, Retry > oi.MaxRetry - oi.FastRetry ? oi.FastInterval : oi.Interval, Retry - 1);
			}
		}
	};

	AddEvent("WindowRegistered", function () {
		// Look at once rather than after 500ms: the window registers with ShellWindows
		// before it is painted. Nothing is lost by looking early - a window that is still
		// Busy or has no Document yet is simply picked up by one of the retries.
		setTimeout(Addons.OpenInstead.Worker, 0, Addons.OpenInstead.MaxRetry);
	});
} else {
	SetTabContents(0, "", await ReadTextFile("addons\\" + Addon_Id + "\\options.html"));
}
