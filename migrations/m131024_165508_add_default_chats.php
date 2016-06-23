<?php

use yii\db\Migration;

class m131024_165508_add_default_chats extends Migration
{
    public function up()
    {
        $usersChats = Yii::$app->db->createCommand();
        $usersSpaces = \Yii::$app->db
            ->createCommand("SELECT user_id, space_id as object_id FROM space_membership WHERE status = 3")
            ->queryAll();
        foreach ($usersSpaces as $item) {
            $item['object_model'] = 'humhub\\modules\\user\\models\\Space';
            $usersChats->insert('chat_user', $item)->execute();
        }

        $usersFriends = \Yii::$app->db
            ->createCommand("SELECT object_model, object_id, user_id FROM user_follow WHERE object_model = 'humhub\\\\modules\\\\user\\\\models\\\\User'")
            ->queryAll();
        foreach ($usersFriends as $item) {
            $usersChats->insert('chat_user', $item)->execute();
        }
    }

    public function down()
    {
        echo "m131024_165508_add_default_chats does not support migration down.\n";
        return false;
    }

}
