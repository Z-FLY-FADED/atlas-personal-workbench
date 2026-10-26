Option Explicit

Dim fileSystem, shell, projectPath, executablePath
Set fileSystem = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
projectPath = fileSystem.GetParentFolderName(WScript.ScriptFullName)
executablePath = fileSystem.BuildPath(projectPath, "release\flutter\windows\WorkSpace.exe")
If Not fileSystem.FileExists(executablePath) Then
  MsgBox "WorkSpace executable was not found. Build the Windows app first.", 16, "WorkSpace"
  WScript.Quit 1
End If
shell.CurrentDirectory = fileSystem.GetParentFolderName(executablePath)
shell.Run Chr(34) & executablePath & Chr(34), 1, False
