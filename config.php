<?php

use humhub\modules\chat\Module;
use humhub\widgets\TopMenu;

return [
    'id' => 'messenger',
    'class' => 'humhub\modules\messenger\Module',
    'namespace' => 'humhub\modules\messenger',
    'events' => [
        ['class' => TopMenu::className(), 'event' => TopMenu::EVENT_INIT, 'callback' => ['humhub\modules\messenger\Module', 'onTopMenuInit']],
    ],
];
