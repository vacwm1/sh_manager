const { app, BrowserWindow, ipcMain, dialog } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    width: 1680,
    height: 1028,
    icon: 'assets/icons/hotel.ico',
    contextIsolation: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});

ipcMain.on('open-file-dialog', (event) => {
  const files = dialog.showOpenDialogSync({ properties: ['openFile'] });
  if (files) event.reply('selected-file', files);
})
