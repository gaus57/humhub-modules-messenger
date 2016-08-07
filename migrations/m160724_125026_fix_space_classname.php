<?php

use yii\db\Migration;

class m160724_125026_fix_space_classname extends Migration
{
    public function up()
    {
        \Yii::$app->db->createCommand()
            ->update(
                'chat_user',
                ['object_model' => 'humhub\\modules\\space\\models\\Space'],
                ['object_model' => 'humhub\\modules\\user\\models\\Space']
            )
            ->execute();
        \Yii::$app->db->createCommand()
            ->update(
                'chat_message',
                ['object_model' => 'humhub\\modules\\space\\models\\Space'],
                ['object_model' => 'humhub\\modules\\user\\models\\Space']
            )
            ->execute();
    }

    public function down()
    {
        \Yii::$app->db->createCommand()
            ->update(
                'chat_user',
                ['object_model' => 'humhub\\modules\\user\\models\\Space'],
                ['object_model' => 'humhub\\modules\\space\\models\\Space']
            )
            ->execute();
        \Yii::$app->db->createCommand()
            ->update(
                'chat_message',
                ['object_model' => 'humhub\\modules\\user\\models\\Space'],
                ['object_model' => 'humhub\\modules\\space\\models\\Space']
            )
            ->execute();
    }
}
