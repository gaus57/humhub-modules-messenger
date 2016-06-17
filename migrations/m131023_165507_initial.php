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

        // Создаем файл конфигурации для сервера
        $modulePath = str_replace('migrations', '', __DIR__);
        $configContent = file_get_contents($modulePath.'server/config.js.exempl');
        $params = require($modulePath.'params.php');
        $replace = [
            '@|db_host|@' => preg_replace('/^.+?host=([^;]+);.*$/', "$1", \Yii::$app->db->dsn),
            '@|db_username|@' => \Yii::$app->db->username,
            '@|db_password|@' => \Yii::$app->db->password,
            '@|db_name|@' => preg_replace('/^.+?dbname=(.+)$/', "$1", \Yii::$app->db->dsn),
            '@|port|@' => $params['node_server_port'],
        ];
        $configContent = str_replace(array_keys($replace), array_values($replace), $configContent);
        file_put_contents($modulePath.'server/config.js', $configContent);
    }

    public function down()
    {
        echo 'install migration not down';
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
