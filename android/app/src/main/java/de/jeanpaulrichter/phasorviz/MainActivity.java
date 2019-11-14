package de.jeanpaulrichter.phasorviz;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.Manifest;
import android.app.Activity;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.OpenableColumns;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.regex.Pattern;

public class MainActivity extends AppCompatActivity
{
    private WebView webview;
    private JSInterface jsinterface;
    private UICallbackHandler uihandler;
    private static final int READ_REQUEST_CODE = 42;
    private static final int WRITE_REQUEST_CODE = 43;
    private static final String TAG = "PhasorViz:Main";
    private boolean webview_ready = false;
    private boolean svg_locked = true;
    private String downloadcode = null;
    private static final Pattern codePattern = Pattern.compile("^[A-Z0-9]{6}$");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        setSupportActionBar((Toolbar) findViewById(R.id.toolbar));

        // if necessary request WRITE_EXTERNAL_STORAGE
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, WRITE_REQUEST_CODE);
        } else {
            // already got permission: create phasorviz folder in /Downloads
            File DownloadDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "phasorviz");
            DownloadDir.mkdirs();
        }

        // create MessageHandler for other threads to change UI
        uihandler = new UICallbackHandler(this);

        // setup webview
        webview = findViewById(R.id.webview);
        WebSettings webSettings = webview.getSettings();
        webSettings.setJavaScriptEnabled(true);
        jsinterface = new JSInterface(this, uihandler);
        webview.addJavascriptInterface(jsinterface, "APP");
        webview.setWebViewClient(new WebViewClient() {
            public void onPageFinished(WebView view, String url) {
            if(downloadcode != null) {
                webview.loadUrl("javascript:phasorviz.download('" + downloadcode + "')");
            } else {
                webview.loadUrl("javascript:phasorviz.init()");
            }
            webview_ready = true;
            }
        });

        // load html
        webview.loadUrl("file:///android_asset/www/index.html");

        // check if App Link used
        Intent appLinkIntent = getIntent();
        String appLinkAction = appLinkIntent.getAction();
        Uri appLinkData = appLinkIntent.getData();
        if(appLinkData != null) {
            String code = appLinkData.getLastPathSegment();
            if(code.length() == 6 && codePattern.matcher(code).matches()) {
                downloadcode = code;
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if(webview_ready) {
            String appLinkAction = intent.getAction();
            Uri appLinkData = intent.getData();
            if (appLinkData != null) {
                final String code = appLinkData.getLastPathSegment();
                if (code.length() == 6 && codePattern.matcher(code).matches()) {
                    new AlertDialog.Builder(this, R.style.Phasorviz_Dialog)
                            .setTitle(R.string.ui_warning)
                            .setMessage(R.string.ui_discardphasors)
                            .setIcon(R.drawable.ic_warning)
                            .setNegativeButton(android.R.string.no, null)
                            .setPositiveButton(android.R.string.yes, new DialogInterface.OnClickListener() {
                                public void onClick(DialogInterface dialog, int whichButton) {
                                    webview.loadUrl("javascript:phasorviz.download('" + code + "')");
                                }
                            })
                            .show();
                }
            }
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu)
    {
        getMenuInflater().inflate(R.menu.menu_main, menu);
        uihandler.setMenu( menu );
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item)
    {
        int id = item.getItemId();

        switch(id) {
            case R.id.action_lock: {
                if (svg_locked) {
                    item.setIcon(ContextCompat.getDrawable(this, R.drawable.ic_unlocked));
                } else {
                    item.setIcon(ContextCompat.getDrawable(this, R.drawable.ic_locked));
                }
                svg_locked = !svg_locked;
                webview.loadUrl("javascript:phasorviz.setlocked(" + svg_locked + ")");
                return true;
            }
            case R.id.action_add:
                webview.loadUrl("javascript:phasorviz.add()");
                return true;
            case R.id.action_edit:
                webview.loadUrl("javascript:phasorviz.dlgEdit()");
                return true;
            case R.id.action_del:
                webview.loadUrl("javascript:phasorviz.dlgDel()");
                return true;
            case R.id.action_reset: {
                new AlertDialog.Builder(this, R.style.Phasorviz_Dialog)
                        .setTitle(R.string.ui_warning)
                        .setMessage(R.string.ui_discardphasors)
                        .setIcon(R.drawable.ic_warning)
                        .setNegativeButton(android.R.string.no, null)
                        .setPositiveButton(android.R.string.yes, new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                webview.loadUrl("javascript:phasorviz.reset()");
                            }})
                        .show();
                return true;
            }
            case R.id.action_about:
                webview.loadUrl("javascript:phasorviz.dlgInfo()");
                return true;
            case R.id.action_settings:
                webview.loadUrl("javascript:phasorviz.dlgSettings()");
                return true;
            case R.id.action_savepng:
                webview.loadUrl("javascript:phasorviz.dlgSave('png')");
                return true;
            case R.id.action_savesvg:
                webview.loadUrl("javascript:phasorviz.dlgSave('svg')");
                return true;
            case R.id.action_savejson:
                webview.loadUrl("javascript:phasorviz.dlgSave('json')");
                return true;
            case R.id.action_upload:
                webview.loadUrl("javascript:phasorviz.dlgUpload()");
                return true;
            case R.id.action_loadjson: {
                // start filemanager to choose json file
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("application/octet-stream");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(Intent.createChooser(intent, getString(R.string.ui_selectjsonfile)), READ_REQUEST_CODE);
                } catch (android.content.ActivityNotFoundException exc) {
                    Log.e(TAG, "Failed to start Activity, " + exc.getMessage());
                    Toast.makeText(this, getString(R.string.ui_installfilemanager), Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent resultData)
    {
        if (requestCode == READ_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            Uri uri = null;
            if (resultData != null) {
                uri = resultData.getData();

                Cursor returnCursor = getContentResolver().query(uri, null, null, null, null);
                int sizeIndex = returnCursor.getColumnIndex(OpenableColumns.SIZE);
                returnCursor.moveToFirst();
                Long filesize = returnCursor.getLong(sizeIndex);

                if(filesize > 10240) {
                    Toast.makeText(this, getString(R.string.ui_filetoobig), Toast.LENGTH_SHORT).show();
                    return;
                } else {
                    try {
                        String temp = readTextFromUri(uri);
                        webview.loadUrl("javascript:phasorviz.load('" + temp + "')");
                    } catch (Exception exc) {
                        Log.e(TAG, "Failed to read " + uri.toString() + ", " + exc.getMessage());
                        Toast.makeText(this, getString(R.string.ui_filereadfailed), Toast.LENGTH_SHORT).show();
                    }
                }
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults)
    {
        switch (requestCode) {
            case WRITE_REQUEST_CODE:
                if(grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    // create phasorviz folder in downloads if necessary
                    File DownloadDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "phasorviz");
                    DownloadDir.mkdirs();
                }
                break;
        }
    }

    // helper function to read String from file
    private String readTextFromUri(Uri uri) throws IOException
    {
        InputStream inputStream = getContentResolver().openInputStream(uri);
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
        StringBuilder stringBuilder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            stringBuilder.append(line);
        }
        inputStream.close();
        reader.close();
        return stringBuilder.toString();
    }
}