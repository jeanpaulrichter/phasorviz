package de.jeanpaulrichter.phasorviz;

import android.content.Context;
import android.os.Handler;
import android.os.Message;
import android.view.Menu;
import android.view.MenuItem;
import androidx.core.content.ContextCompat;

public class CallbackHandler extends Handler
{
    private Context mContext = null;
    private Menu mMenu = null;

    public CallbackHandler (Context context) {
        mContext = context;
    }

    public void setMenu(Menu menu)
    {
        mMenu = menu;
    }

    @Override
    public void handleMessage(Message msg) {
        if( mMenu == null ) {
            return;
        }
        switch(msg.what) {
            case 0: {
                MenuItem item_edit = mMenu.findItem(R.id.action_edit);
                MenuItem item_delete = mMenu.findItem(R.id.action_del);
                item_edit.setIcon(ContextCompat.getDrawable(mContext, R.drawable.ic_edit));
                item_delete.setIcon(ContextCompat.getDrawable(mContext, R.drawable.ic_delete));
                break;
            }
            case 1: {
                MenuItem item_edit = mMenu.findItem(R.id.action_edit);
                MenuItem item_delete = mMenu.findItem(R.id.action_del);
                item_edit.setIcon(ContextCompat.getDrawable(mContext, R.drawable.ic_edit_disabled));
                item_delete.setIcon(ContextCompat.getDrawable(mContext, R.drawable.ic_delete_disabled));
                break;
            }
        }
    }
}
