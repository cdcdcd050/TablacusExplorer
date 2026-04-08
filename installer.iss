[Setup]
AppName=Tablacus Explorer (Fork)
AppVersion=1.0.1
AppPublisher=cdcdcd050
AppPublisherURL=https://github.com/cdcdcd050/TablacusExplorer
DefaultDirName={autopf}\Tablacus Explorer
DefaultGroupName=Tablacus Explorer (Fork)
OutputDir=Output
OutputBaseFilename=TablacusExplorer-Fork-v1.0.1-Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName=Tablacus Explorer (Fork)
LicenseFile=LICENSE.TXT

[Files]
Source: "Debug\TE64.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Debug\TE32.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Debug\lib\te64.dll"; DestDir: "{app}\lib"; Flags: ignoreversion
Source: "Debug\lib\te32.dll"; DestDir: "{app}\lib"; Flags: ignoreversion
Source: "Debug\lib\tewv64.dll"; DestDir: "{app}\lib"; Flags: ignoreversion
Source: "Debug\lib\tewv32.dll"; DestDir: "{app}\lib"; Flags: ignoreversion
Source: "Debug\script\*"; DestDir: "{app}\script"; Flags: ignoreversion recursesubdirs
Source: "Debug\addons\*"; DestDir: "{app}\addons"; Flags: ignoreversion recursesubdirs
Source: "Debug\init\*"; DestDir: "{app}\init"; Flags: ignoreversion recursesubdirs
Source: "Debug\lang\*"; DestDir: "{app}\lang"; Flags: ignoreversion recursesubdirs; Check: DirExists(ExpandConstant('{src}\Debug\lang'))
Source: "LICENSE.TXT"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Tablacus Explorer (Fork)"; Filename: "{app}\TE64.exe"
Name: "{group}\Uninstall Tablacus Explorer (Fork)"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Tablacus Explorer (Fork)"; Filename: "{app}\TE64.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"

[Run]
Filename: "{app}\TE64.exe"; Description: "Launch Tablacus Explorer (Fork)"; Flags: nowait postinstall skipifsilent
