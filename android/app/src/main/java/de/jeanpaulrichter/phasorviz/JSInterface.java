package de.jeanpaulrichter.phasorviz;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.util.Log;
import android.view.MenuItem;
import android.widget.Toast;
import android.util.Base64;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.util.Locale;

import androidx.core.content.ContextCompat;

public class JSInterface
{
    private Context _context;
    private Handler _ui;
    private static final String TAG = "PhasorViz:JSInterface";

    JSInterface(Context c, Handler callback)
    {
        _context = c;
        _ui = callback;
    }

    @android.webkit.JavascriptInterface
    public void showToast(String s)
    {
        if( s.length() < 128 ) {
            Toast.makeText(_context, s, Toast.LENGTH_SHORT).show();
        }
    }

    @android.webkit.JavascriptInterface
    public void enableButtons(boolean v)
    {
        _ui.sendEmptyMessage(v ? UICallbackHandler.ENABLE_DELEDIT : UICallbackHandler.DISABLE_DELEDIT);
    }

    @android.webkit.JavascriptInterface
    public String getDeviceString() {
        return Build.MANUFACTURER + " " + Build.MODEL + ": Android " + Build.VERSION.RELEASE;
    }

    @android.webkit.JavascriptInterface
    public String getLanguage() {
        return Locale.getDefault().getISO3Language();
    }

    @android.webkit.JavascriptInterface
    public int getVersion() {
        try {
            PackageInfo pInfo = _context.getPackageManager().getPackageInfo(_context.getPackageName(), 0);
            return pInfo.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            Log.e(TAG, e.getMessage());
            return 0;
        }
    }

    @android.webkit.JavascriptInterface
    public void saveFile(String filename, String data)
    {
        String state = Environment.getExternalStorageState();
        File file = null;
        try {
            if (!Environment.MEDIA_MOUNTED.equals(state)) {
                throw new PVException(_context.getString(R.string.ui_noextstorageaccess));
            }
            file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "phasorviz/" + filename);

            if(file.exists()) {
                throw new PVException(_context.getString(R.string.ui_filealreadyexists));
            }
            if(file.isDirectory()) {
                throw new PVException(_context.getString(R.string.ui_fileisdirectory));
            }
            file.createNewFile();

            if(data.startsWith("data:image/png;base64,")) {
                FileOutputStream output = new FileOutputStream(file);
                byte[] binary_data = Base64.decode(data.substring(22), Base64.DEFAULT);
                output.write(binary_data);
                output.close();
            } else {
                BufferedWriter output = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(file)));
                output.write(data);
                output.flush();
                output.close();
            }
            Log.i(TAG, file.toString() + " saved");
            Toast.makeText(_context, _context.getString(R.string.ui_filesaved), Toast.LENGTH_SHORT).show();
        } catch(PVException exc) {
            Toast.makeText(_context, exc.getMessage(), Toast.LENGTH_SHORT).show();
        } catch(Exception exc) {
            Log.e(TAG, "Failed to write " + file.toString() + ", " + exc.getMessage());
            Toast.makeText(_context, _context.getString(R.string.ui_filesavefailed), Toast.LENGTH_SHORT).show();
        }
    }
}
