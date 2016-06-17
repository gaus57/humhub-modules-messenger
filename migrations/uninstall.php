<?php

use yii\db\Migration;

class uninstall extends Migration
{

    public function up()
    {
        $this->dropTable('chat_message');
        $this->dropTable('chat_message_read');
        $this->dropTable('chat_user');
    }

    public function down()
    {
        echo "uninstall does not support migration down.\n";
        return false;
    }

}
