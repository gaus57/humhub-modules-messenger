<?php

namespace humhub\modules\messenger\models;

use humhub\components\ActiveRecord;

/**
 *
 */
class ChatMessageRead extends ActiveRecord
{
    /**
     * @return string the associated database table name
     */
    public static function tableName()
    {
        return 'chat_message_read';
    }
}
