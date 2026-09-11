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

		// Explorer windows hidden before we could decide about them: hwnd -> tick.
		// Nothing may be left in here - an invisible Explorer window left behind is the
		// one failure this addon must not produce, so every path either takes the window
		// over or gives it back, and HoldMax is the backstop for a window that never
		// becomes readable.
		Hidden: {},
		HoldMax: 5000,

		Release: function (exp, hwnd) {
			const held = Addons.OpenInstead.Hidden[hwnd];
			delete Addons.OpenInstead.Hidden[hwnd];
			if (held) {
				exp.Left = held.left;
				exp.Top = held.top;
			}
			exp.Visible = true;
		},

		Worker: async function (Retry) {
			const oi = Addons.OpenInstead;
			const sw = await sha.Windows();
			const seen = {};
			for (let i = await sw.Count; i-- > 0;) {
				let exp = await sw.item(i);
				if (exp) {
					// One batch. Every COM round-trip taken before the window is parked is time it
					// spends on screen, so read everything the decision and the parking need at once.
					// HWND is the one property that might not come through, so it degrades to 0 and
					// the window is then simply handled the old way, after it is up.
					let hwndP;
					try {
						hwndP = Promise.resolve(exp.HWND).catch(function () { return 0; });
					} catch (e) {
						hwndP = Promise.resolve(0);
					}
					let r = await Promise.all([exp.Visible, exp.Busy, exp.Document, exp.FullName, exp.Left, exp.Top, hwndP]);
					const hwnd = r[6] || 0;
					if (hwnd) {
						seen[hwnd] = 1;
					}
					const held = hwnd ? oi.Hidden[hwnd] : 0;
					if (r[1]) {
						// Busy, so there is no Document to decide on yet - but the window is about
						// to be painted. Hide it now and decide on a later pass: that is what keeps
						// a real Explorer window from flashing up. Deciding now instead would read
						// doc.FocusedItem before the view has it and select the wrong file, so the
						// hiding moves early and the decision stays where it was.
						if (r[0] && hwnd && !held && /\\explorer\.exe$/i.test(r[3])) {
							// Parked off-screen rather than hidden: the shell still finishes bringing the
							// window up, which is when it applies the item to select. Hiding it here instead
							// cut the flash to nothing but lost the selection - the takeover then landed on
							// the first item in the folder instead of the download.
							oi.Hidden[hwnd] = { t: Date.now(), left: r[4], top: r[5] };
							exp.Left = -32000;
							exp.Top = -32000;
						} else if (held && Date.now() - held.t > oi.HoldMax) {
							oi.Release(exp, hwnd);
						}
					} else if (r[0] || held) {
						let doc = await r[2];
						let mine = false;
						if (doc) {
							try {
								let path = await api.GetDisplayNameOf(doc, SHGDN_FORPARSING);
								let url = doc;
								if (!path && /\\explorer\.exe$/i.test(r[3])) {
									path = await api.PathCreateFromUrl(await exp.LocationURL);
									url = path;
								}
								if (path && oi[/^.?:\\|^\\\\/.test(path) ? "RealFolders" : "SpecialFolders"]) {
									const pid = await api.ILCreateFromPath(url);
									if (!await RunEvent3("UseExplorer", pid)) {
										mine = true;
										// The item Explorer was asked to select (/select, "Open containing
										// folder"). Read it before hiding the window and regardless of TakeOver.
										const focused = await doc.FocusedItem;
										exp.Visible = false;
										let bQuit = false;
										try {
											let FV = await (await GetFolderView()).Navigate((await pid.ExtendedProperty("linktarget")) || url, SBSP_NEWBROWSER);
											if (oi.TakeOver) {
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
											for (let n = 20; n-- > 0;) {
												bQuit = !hwnd || !await api.IsWindow(hwnd);
												if (bQuit) {
													break;
												}
												await new Promise(function (resolve) { setTimeout(resolve, 100); });
											}
										} finally {
											delete oi.Hidden[hwnd];
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
						if (!mine && held && (doc || Date.now() - held.t > oi.HoldMax)) {
							// Hidden on spec, and not ours after all - give it back.
							oi.Release(exp, hwnd);
						}
					}
				}
			}
			for (const h in oi.Hidden) {
				if (!seen[h]) {
					// Gone from the list on its own; nothing left to give back.
					delete oi.Hidden[h];
				}
			}
			if (Retry <= 0 && Object.keys(oi.Hidden).length) {
				// Never stop while a window is still hidden on spec.
				Retry = oi.FastRetry;
			}
			if (Retry > 0) {
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
