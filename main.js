const electron = require('electron')

const {
  app,
  Menu,
  Tray,
  BrowserWindow,
  ipcMain,
  nativeImage
} = require('electron')
const path = require('path')
const url = require('url')
// const Badge = require('electron-windows-badge')
const Badge = require('electron-badge');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let tray = null
// const Menu = electron.Menu

function createWindow() {
  // 隐藏菜单栏
  // Menu.setApplicationMenu(null)
  // Create the browser window.
  win = new BrowserWindow({
    // width: 800,
    // height: 600,
    autoHideMenuBar: true,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    // frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  })
  const badgeOptions = {};
  new Badge(win, badgeOptions);

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, '/app/index.html'),
    protocol: 'file:',
    slashes: true
  }))
  //开启调试工具  
  win.webContents.openDevTools()
  // win.setMenu(null)
  // 窗口关闭的监听  
  win.on('closed', (event) => {
    //回收BrowserWindow对象
    win = null
  })
  // 当我们点击关闭时触发close事件，我们按照之前的思路在关闭时，隐藏窗口，隐藏任务栏窗口
  // event.preventDefault(); 禁止关闭行为(非常必要，因为我们并不是想要关闭窗口，所以需要禁止默认行为)
  win.on('close', (event) => {
    win.hide();
    win.setSkipTaskbar(true);
    event.preventDefault();
  })
  win.on('show', () => {
    win.webContents.send('init-windows-badge')
    // tray.setHighlightMode('always')
  })
  win.on('hide', () => {
    win.reload()
    // win.webContents.send('reset-session')
    // tray.setHighlightMode('never')
  })
  //创建系统通知区菜单
  tray = new Tray(path.join(__dirname, 'icon.ico'))
  const contextMenu = Menu.buildFromTemplate([{
      label: '打开',
      click: () => {
        win.show()
        win.setSkipTaskbar(false)
      }
    },
    {
      label: '退出',
      click: () => {
        win.destroy() //我们需要在这里有一个真正的退出（这里直接强制退出）
        app.quit()
      }
    }
  ])
  tray.setToolTip('欢迎使用快讯\r\n恒佳08(hengjia08)')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    //我们这里模拟桌面程序点击通知区图标实现打开关闭应用的功能
    win.isVisible() ? win.show() : win.show()
    win.isVisible() ? win.setSkipTaskbar(false) : win.setSkipTaskbar(true);
  })
}

// Electron单实例
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时,将会聚焦到myWindow这个窗口
    if (win) {
      if (win.isMinimized()) win.restore()
      if (!win.isVisible()) {
        win.show()
        win.setSkipTaskbar(false)
      }
      win.focus()
    }
  })
  // 创建 myWindow, 加载应用的其余部分, etc...
  app.on('ready', createWindow)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// 创建图片预览窗口
let previewImgWin;
// 监听渲染进程事件，并接收数据，将数据传递给子窗口
ipcMain.on('previewPic', (event, params) => {
  createPreviewImgWindow(params)
})

function createPreviewImgWindow(params) {
  // 创建浏览器窗口。
  previewImgWin = new BrowserWindow({
    frame: false,
    parent: win, //win是主窗口
    show: false,
    transparent: true,
    modal: true,
    webPreferences: {
      nodeIntegration: true
    },
    resizable: false
  })
  // 全屏
  previewImgWin.setFullScreen(true)
  //开启调试工具  
  // previewImgWin.webContents.openDevTools()
  // 去除菜单
  previewImgWin.setMenu(null)
  // 加载页面
  previewImgWin.loadURL(path.join('file:', __dirname, 'app/im/previewImg.html')); //new.html是新开窗口的渲染进程
  // 监听窗口关闭
  previewImgWin.on('closed', () => {
    previewImgWin = null
  })
  // previewImgWin.once('show', function () {
  //   console.log(22222222222)
  //   // 向子窗口发送数据
  //   previewImgWin.webContents.send('imgMessage', params);
  // })
  previewImgWin.webContents.on('did-finish-load', function () {
    // 向子窗口发送数据
    previewImgWin.webContents.send('imgMessage', params);
  });
  previewImgWin.once('ready-to-show', () => {
    previewImgWin.show();
  });
}

// 添加未读消息badge
ipcMain.on("draw-windows-badge", (event, params) => {
  if (params.task) {
    const taskImg = nativeImage.createFromDataURL(params.task);
    const trayImg = nativeImage.createFromDataURL(params.tray);
    win.setOverlayIcon(taskImg, "taskBadge");
    tray.setImage(trayImg)
  } else {
    tray.setImage(path.join(__dirname, 'icon.ico'));
    win.setOverlayIcon(null, "Removing taskBadge");
  }
})

// 任务栏闪烁
ipcMain.on("flash-frame", (event, params) => {
  if (!win.isFocused()) {
    // win.showInactive();
    win.flashFrame(true);
  } else {
    win.flashFrame(false);
  }
  // win.flashFrame(true)
  // win.once('focus', () => win.flashFrame(false))
})