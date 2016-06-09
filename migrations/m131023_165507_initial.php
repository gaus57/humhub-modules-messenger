<?php

use yii\db\Migration;

class m131023_165507_initial extends Migration
{

    public function up()
    {

        $this->createTable('chat_message', array(
            'id' => 'pk',
            'user_id' => 'int(11) NOT NULL',
            'object_model' => 'varchar(255) NOT NULL DEFAULT \'\'',
            'object_id' => 'int(11) NOT NULL',
            'text' => 'text NOT NULL',
            'created_at' => 'datetime NOT NULL',
                ), '');

        $this->createTable('chat_message_read', array(
            'chat_message_id' => 'int(11) NOT NULL',
            'user_id' => 'int(11) NOT NULL',
            'read_at' => 'datetime NOT NULL',
                ), '');
        $this->addPrimaryKey('pk_chat_message_read', 'chat_message_read', 'chat_message_id,user_id');
        $this->addForeignKey('fk-chat_message_read-chat_message_id', 'chat_message_read', 'chat_message_id', 'chat_message', 'id', 'CASCADE');

        $this->createTable('chat_user', array(
            'id' => 'pk',
            'user_id' => 'int(11) NOT NULL',
            'object_id' => 'int(11) NOT NULL',
            'object_model' => 'varchar(255) NOT NULL DEFAULT \'\'',
                ), '');
    }

    public function down()
    {
        echo "m131023_165507_initial does not support migration down.\n";
        return false;
    }

    /*
      // Use safeUp/safeDown to do migration with transaction
      public function safeUp()
      {
      }

      public function safeDown()
      {
      }
     */
}
