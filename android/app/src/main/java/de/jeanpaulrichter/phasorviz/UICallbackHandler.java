package de.jeanpaulrichter.phasorviz;

import android.content.Context;
import android.os.Handler;
import android.os.Message;
import android.view.Menu;
import android.view.MenuItem;
import androidx.core.content.ContextCompat;

public class UICallbackHandler extends Handler
{
    private Context _context = null;
    private Menu _menu = null;

    public static final int DISABLE_DELEDIT = 0;
    public static final int ENABLE_DELEDIT = 1;

    public UICallbackHandler(Context context) {
        _context = context;
    }

    public void setMenu(Menu menu)
    {
        _menu = menu;
    }

    @Override
    public void handleMessage(Message msg) {
        if( _menu == null ) {
            return;
        }
        switch(msg.what) {
            case ENABLE_DELEDIT: {
                MenuItem item_edit = _menu.findItem(R.id.action_edit);
                MenuItem item_delete = _menu.findItem(R.id.action_del);
                item_edit.setIcon(ContextCompat.getDrawable(_context, R.drawable.ic_edit));
                item_delete.setIcon(ContextCompat.getDrawable(_context, R.drawable.ic_delete));
                break;
            }
            case DISABLE_DELEDIT: {
                MenuItem item_edit = _menu.findItem(R.id.action_edit);
                MenuItem item_delete = _menu.findItem(R.id.action_del);
                item_edit.setIcon(ContextCompat.getDrawable(_context, R.drawable.ic_edit_disabled));
                item_delete.setIcon(ContextCompat.getDrawable(_context, R.drawable.ic_delete_disabled));
                break;
            }
        }
    }
}
